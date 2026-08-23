import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly webAppUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly videoService: VideoService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      // Don't crash the whole app if payments aren't configured yet - other
      // modules (auth, consultants, bookings) should keep working without
      // Stripe keys set. Calls into this service will fail clearly instead.
      console.warn(
        '[payments] STRIPE_SECRET_KEY is not set - payment endpoints will fail until it is configured in backend/.env',
      );
    }
    this.stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
      apiVersion: '2024-06-20',
    });
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    this.webAppUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
  }

  // ---------- Consultant payout onboarding (Stripe Connect Express) ----------

  async startConnectOnboarding(userId: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('No consultant profile found');

    let accountId = profile.payoutAccountId;

    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: profile.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await this.prisma.consultantProfile.update({
        where: { id: profile.id },
        data: { payoutAccountId: accountId },
      });
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      // Stripe redirects here if the onboarding link expires before completion
      refresh_url: `${this.webAppUrl}/onboarding/payouts?refresh=1`,
      return_url: `${this.webAppUrl}/onboarding/payouts?return=1`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async getConnectStatus(userId: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('No consultant profile found');
    if (!profile.payoutAccountId) {
      return { connected: false, chargesEnabled: false, detailsSubmitted: false };
    }

    const account = await this.stripe.accounts.retrieve(profile.payoutAccountId);
    return {
      connected: true,
      chargesEnabled: !!account.charges_enabled,
      detailsSubmitted: !!account.details_submitted,
      payoutsEnabled: !!account.payouts_enabled,
    };
  }

  // ---------- Checkout for a paid booking ----------

  async createCheckoutSession(clientId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        serviceType: true,
        consultant: true,
        payment: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('This booking does not belong to you');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Booking is ${booking.status} - only a PENDING (unpaid) booking can be checked out`,
      );
    }
    if (booking.payment && booking.payment.status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('This booking has already been paid for');
    }
    if (!booking.consultant.payoutAccountId) {
      throw new BadRequestException(
        "This consultant hasn't finished connecting their payout account yet - please try again later",
      );
    }

    const priceCharged = Number(booking.priceCharged);
    const commissionAmount = Number(booking.commissionAmount);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: booking.serviceType.currency.toLowerCase(),
            product_data: { name: booking.serviceType.name },
            unit_amount: toCents(priceCharged),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        // Platform keeps this slice; the rest transfers to the consultant's
        // connected account automatically - this is the commission split
        // described in the product spec, enforced by Stripe rather than a
        // manual payout job.
        application_fee_amount: toCents(commissionAmount),
        transfer_data: {
          destination: booking.consultant.payoutAccountId,
        },
      },
      metadata: { bookingId: booking.id },
      success_url: `${this.webAppUrl}/bookings?payment=success`,
      cancel_url: `${this.webAppUrl}/bookings?payment=cancelled`,
    });

    if (!session.url) {
      throw new InternalServerErrorException('Stripe did not return a checkout URL');
    }
    return { url: session.url };
  }

  // ---------- Webhook ----------

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  async handleWebhookEvent(event: Stripe.Event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) return;

      const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return;

      // Idempotency: Stripe may retry webhook delivery - if we've already
      // recorded a successful payment for this booking, do nothing further.
      const existingPayment = await this.prisma.payment.findUnique({
        where: { bookingId },
      });
      if (existingPayment?.status === PaymentStatus.SUCCEEDED) return;

      const amount = Number(booking.priceCharged);
      const platformFee = Number(booking.commissionAmount);
      const consultantPayout = round2(amount - platformFee);
      const providerTxnId =
        typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

      await this.prisma.$transaction([
        this.prisma.payment.upsert({
          where: { bookingId },
          create: {
            bookingId,
            amount,
            platformFee,
            consultantPayout,
            providerTxnId,
            status: PaymentStatus.SUCCEEDED,
          },
          update: {
            status: PaymentStatus.SUCCEEDED,
            providerTxnId,
          },
        }),
        this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CONFIRMED },
        }),
      ]);

      // Now that the booking is actually confirmed (money has cleared), create
      // the video meeting link if this consultation mode needs one. This is
      // deliberately outside the $transaction above - it's an external API
      // call, not a DB write, and a slow/failed video-provider call shouldn't
      // roll back a successful payment.
      await this.videoService.confirmMeetingForBooking(bookingId);
    }

    // Other event types (e.g. payment_intent.payment_failed) would be
    // handled here as the failure-notification flow gets built.
  }

  // ---------- Refunds ----------
  //
  // Called from bookings.service.ts when a paid, CONFIRMED booking is
  // cancelled and the cancellation policy says it's owed a refund (see
  // resolveCommissionRate-adjacent logic there for who's eligible). Uses
  // `reverse_transfer` + `refund_application_fee` because this payment used
  // Stripe's "separate charges and transfers" model (transfer_data on the
  // PaymentIntent) rather than destination charges - without those two flags,
  // refunding the PaymentIntent would refund the customer but leave the
  // money sitting in the consultant's connected account and leave the
  // platform's application fee uncollected-back.
  async refundPayment(bookingId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId } });
    if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
      return; // nothing was actually captured - nothing to refund
    }
    if (!payment.providerTxnId) {
      throw new InternalServerErrorException(
        'Payment has no provider transaction id to refund',
      );
    }

    // Note: this will fail if the consultant's connected account balance is
    // insufficient to reverse the transfer (e.g. they've already been paid
    // out to their bank). Stripe surfaces a clear error in that case; there's
    // no automatic retry/dunning here yet - an admin would need to follow up
    // manually. Worth hardening before this handles real refund volume.
    await this.stripe.refunds.create({
      payment_intent: payment.providerTxnId,
      reverse_transfer: true,
      refund_application_fee: true,
    });

    await this.prisma.payment.update({
      where: { bookingId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
