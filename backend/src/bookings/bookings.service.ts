import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, ConsultationMode, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateBookingDto } from './dto/create-booking.dto';

interface Window {
  startMin: number; // minutes from midnight
  endMin: number;
}

const COMPLETION_SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class BookingsService implements OnModuleInit {
  // Platform take rate. Overridable per deployment via env, and per-category
  // or per-consultant via the admin module (see resolveCommissionRate).
  private readonly commissionRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
    private readonly paymentsService: PaymentsService,
    config: ConfigService,
  ) {
    this.commissionRate = Number(config.get('COMMISSION_RATE') ?? 0.15);
  }

  // ---------- Booking completion sweep ----------
  //
  // Nothing else in the app ever moves a booking from CONFIRMED to COMPLETED -
  // without this, "only review a COMPLETED booking" would be a rule with no
  // way to ever satisfy it. Runs once on startup, then every 15 minutes.
  //
  // Deliberately a plain setInterval rather than @nestjs/schedule: this is a
  // single background task, and avoiding a new dependency keeps things simple
  // to verify. Known limitation: this is in-process and tied to one server
  // instance's lifetime - fine for a single-instance deployment (this MVP's
  // target), but if this were horizontally scaled, each instance would run
  // its own sweep. That's wasteful but not incorrect (the updateMany below is
  // safe to run concurrently), so it's a performance note, not a correctness
  // bug, if that day comes.
  async onModuleInit() {
    await this.completePastBookings().catch((err) =>
      console.error('[bookings] initial completion sweep failed:', err),
    );
    setInterval(() => {
      this.completePastBookings().catch((err) =>
        console.error('[bookings] completion sweep failed:', err),
      );
    }, COMPLETION_SWEEP_INTERVAL_MS);
  }

  async completePastBookings(): Promise<void> {
    const now = new Date();
    // Prisma can't compare scheduledAt + durationMins (a derived value) to
    // `now` directly in a `where` filter, so this fetches candidates and
    // filters in JS rather than reaching for raw SQL - bounded by "how many
    // bookings are currently CONFIRMED", not the whole booking history,
    // since completed ones won't show up here again.
    const candidates = await this.prisma.booking.findMany({
      where: { status: BookingStatus.CONFIRMED },
      select: { id: true, scheduledAt: true, durationMins: true },
    });

    const pastIds = candidates
      .filter((b) => new Date(b.scheduledAt.getTime() + b.durationMins * 60_000) < now)
      .map((b) => b.id);

    if (pastIds.length === 0) return;

    await this.prisma.booking.updateMany({
      where: { id: { in: pastIds } },
      data: { status: BookingStatus.COMPLETED },
    });
    console.log(`[bookings] marked ${pastIds.length} booking(s) as COMPLETED`);
  }

  // ---------- Availability → bookable slots ----------
  //
  // Known simplification for this MVP slice: all times (availability windows,
  // booking scheduledAt) are treated as naive UTC rather than converted through
  // the consultant's stored timezone. Proper timezone handling means storing
  // availability in the consultant's local time and converting to/from UTC at
  // the API boundary using their `User.timezone` - worth doing before this
  // goes to real users across timezones, but out of scope for this slice.

  async getAvailableSlots(
    consultantId: string,
    serviceTypeId: string,
    dateStr: string,
  ): Promise<string[]> {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
    });
    if (!serviceType || serviceType.consultantId !== consultantId || !serviceType.active) {
      throw new NotFoundException('Service type not found for this consultant');
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const dayOfWeek = date.getUTCDay();

    const rules = await this.prisma.availability.findMany({
      where: {
        consultantId,
        OR: [
          { isRecurring: true, dayOfWeek },
          { isRecurring: false, specificDate: date },
        ],
      },
    });

    let windows: Window[] = rules
      .filter((r) => !r.isBlocked)
      .map((r) => ({ startMin: toMinutes(r.startTime), endMin: toMinutes(r.endTime) }));

    const blocks = rules.filter((r) => r.isBlocked);
    for (const block of blocks) {
      windows = subtractBlock(windows, toMinutes(block.startTime), toMinutes(block.endTime));
    }

    const duration = serviceType.durationMins;
    const candidateMinutes: number[] = [];
    for (const w of windows) {
      for (let t = w.startMin; t + duration <= w.endMin; t += duration) {
        candidateMinutes.push(t);
      }
    }

    // Exclude times that overlap an existing (non-cancelled) booking for this
    // consultant on the same date.
    const dayStart = date;
    const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        consultantId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        scheduledAt: { gte: dayStart, lt: dayEnd },
      },
      select: { scheduledAt: true, durationMins: true },
    });

    const now = new Date();
    const isToday = dayStart.toDateString() === now.toDateString();
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    const availableMinutes = candidateMinutes.filter((start) => {
      const end = start + duration;
      if (isToday && start <= nowMinutes) return false; // no booking into the past

      for (const booking of existingBookings) {
        const bStart =
          booking.scheduledAt.getUTCHours() * 60 + booking.scheduledAt.getUTCMinutes();
        const bEnd = bStart + booking.durationMins;
        const overlaps = start < bEnd && end > bStart;
        if (overlaps) return false;
      }
      return true;
    });

    return availableMinutes
      .sort((a, b) => a - b)
      .map((mins) => {
        const slot = new Date(dayStart);
        slot.setUTCHours(Math.floor(mins / 60), mins % 60, 0, 0);
        return slot.toISOString();
      });
  }

  // ---------- Booking creation ----------

  async createBooking(clientId: string, dto: CreateBookingDto) {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: dto.serviceTypeId },
      include: { consultant: { include: { category: true } } },
    });
    if (!serviceType || serviceType.consultantId !== dto.consultantId || !serviceType.active) {
      throw new NotFoundException('Service type not found');
    }
    if (!serviceType.consultationModes.includes(dto.consultationMode)) {
      throw new BadRequestException(
        `This consultation type does not support ${dto.consultationMode}`,
      );
    }
    if (
      dto.consultationMode === ConsultationMode.IN_PERSON &&
      !serviceType.consultant.inPersonAddress
    ) {
      throw new BadRequestException(
        'Consultant has not set an in-person address yet',
      );
    }
    if (
      dto.consultationMode === ConsultationMode.ZOOM &&
      !serviceType.consultant.zoomRefreshToken
    ) {
      throw new BadRequestException('Consultant has not connected Zoom yet');
    }
    if (
      dto.consultationMode === ConsultationMode.GOOGLE_MEET &&
      !serviceType.consultant.googleRefreshToken
    ) {
      throw new BadRequestException('Consultant has not connected Google Meet yet');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    const dateStr = scheduledAt.toISOString().slice(0, 10);

    // Re-validate against live availability rather than trusting the client
    // to only submit a slot it previously fetched - prevents double-booking
    // races and stale-slot submissions.
    const availableSlots = await this.getAvailableSlots(
      dto.consultantId,
      dto.serviceTypeId,
      dateStr,
    );
    if (!availableSlots.includes(scheduledAt.toISOString())) {
      throw new BadRequestException(
        'That slot is no longer available - please pick another time',
      );
    }

    const price = Number(serviceType.price);
    const commissionRate = this.resolveCommissionRate(serviceType.consultant);
    const commissionAmount = price > 0 ? round2(price * commissionRate) : 0;

    // No payment integration yet (next slice) - a free booking is confirmed
    // immediately; a paid booking is created PENDING until payment capture
    // exists. This keeps the booking record and slot-hold accurate today,
    // and the payments slice only needs to flip status, not invent this logic.
    const status = price === 0 ? BookingStatus.CONFIRMED : BookingStatus.PENDING;

    const address =
      dto.consultationMode === ConsultationMode.IN_PERSON
        ? serviceType.consultant.inPersonAddress
        : null;

    const created = await this.prisma.booking.create({
      data: {
        clientId,
        consultantId: dto.consultantId,
        serviceTypeId: dto.serviceTypeId,
        scheduledAt,
        durationMins: serviceType.durationMins,
        status,
        consultationMode: dto.consultationMode,
        // meetingLink starts null regardless of mode - video.service.ts fills
        // it in once the booking is actually confirmed (immediately below for
        // free bookings, or from the Stripe webhook for paid ones), since a
        // meeting shouldn't exist for a booking that might still fail payment.
        meetingLink: null,
        address,
        priceCharged: price,
        commissionAmount,
      },
    });

    if (created.status === BookingStatus.CONFIRMED) {
      // Free booking - confirmed immediately, so create the meeting link now
      // rather than making the client wait for a separate step. For
      // IN_APP_VIDEO this is fast; for Zoom/Google it's one API round trip.
      await this.videoService.confirmMeetingForBooking(created.id);
    }

    return this.getBookingForParticipant(created.id);
  }

  // Re-fetches a booking with only the fields safe to hand back over the API -
  // notably, ConsultantProfile now carries OAuth secrets (zoom*/google*
  // token fields) and User carries passwordHash, so `include: { user: true }`
  // style relations must never be used on anything returned to a client.
  private async getBookingForParticipant(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        serviceType: true,
        consultant: { select: { user: { select: { fullName: true } } } },
      },
    });
  }

  // Consultant-level override wins if set; otherwise category-level override;
  // otherwise the platform-wide default from COMMISSION_RATE. This is the
  // "set default globally, override per category or per consultant" model
  // described in the product spec's platform-provider section.
  private resolveCommissionRate(consultant: {
    commissionRateOverride: number | null;
    category?: { commissionRateOverride: number | null } | null;
  }): number {
    if (consultant.commissionRateOverride != null) {
      return consultant.commissionRateOverride;
    }
    if (consultant.category?.commissionRateOverride != null) {
      return consultant.category.commissionRateOverride;
    }
    return this.commissionRate;
  }

  // ---------- Listing & lifecycle ----------

  async listMyBookingsAsClient(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: {
        serviceType: true,
        consultant: {
          select: {
            user: { select: { fullName: true } },
            category: { select: { name: true } },
          },
        },
        review: { select: { rating: true, comment: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async listMyBookingsAsConsultant(userId: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('No consultant profile found');

    return this.prisma.booking.findMany({
      where: { consultantId: profile.id },
      include: {
        serviceType: true,
        client: { select: { fullName: true, email: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  // A consultant-or-admin-initiated cancellation is never the client's
  // fault, so it's always refunded regardless of notice given - mirrors the
  // "no-show by consultant -> client gets a refund" rule from the product
  // spec's edge-case list. A client-initiated cancellation is only refunded
  // if it clears the consultant's own cancellationPolicyHours window -
  // mirroring that same list's "no-show by client -> consultant may still
  // get paid" rule. Admin cancellations (dispute resolution) are treated
  // like consultant-initiated ones: always refunded.
  async cancelBooking(user: { id: string; role: Role }, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { consultant: true, payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isClient = booking.clientId === user.id;
    const isConsultant = booking.consultant.userId === user.id;
    const isAdmin = user.role === Role.ADMIN;
    if (!isClient && !isConsultant && !isAdmin) {
      throw new ForbiddenException('This booking does not belong to you');
    }
    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(`Cannot cancel a booking that is already ${booking.status}`);
    }

    const hoursUntilAppointment = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    const withinCancellationPolicy = hoursUntilAppointment >= booking.consultant.cancellationPolicyHours;
    const shouldRefund =
      booking.payment?.status === PaymentStatus.SUCCEEDED &&
      (isConsultant || isAdmin || withinCancellationPolicy);

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    if (shouldRefund) {
      // Runs after the status update commits - if the Stripe refund call
      // fails (e.g. insufficient connected-account balance to reverse the
      // transfer), the booking still ends up CANCELLED; an admin would need
      // to follow up on the refund manually. Surfacing that failure state in
      // the UI is a natural next step, not built yet.
      await this.paymentsService.refundPayment(bookingId);
    }

    return { ...(await this.getBookingForParticipant(bookingId)), refunded: shouldRefund };
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Subtracts a blocked [start,end) range from a list of open windows,
// possibly splitting a window into two if the block sits in its middle.
function subtractBlock(windows: Window[], blockStart: number, blockEnd: number): Window[] {
  const result: Window[] = [];
  for (const w of windows) {
    if (blockEnd <= w.startMin || blockStart >= w.endMin) {
      result.push(w); // no overlap
      continue;
    }
    if (blockStart > w.startMin) {
      result.push({ startMin: w.startMin, endMin: Math.min(blockStart, w.endMin) });
    }
    if (blockEnd < w.endMin) {
      result.push({ startMin: Math.max(blockEnd, w.startMin), endMin: w.endMin });
    }
  }
  return result;
}
