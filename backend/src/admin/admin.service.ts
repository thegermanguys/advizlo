import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus, Role, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function money(value: { toString(): string } | null | undefined): number {
  return Number(value ?? 0);
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Consultant verification ----------

  // Admin is a trusted role, but there's still no reason to ship Zoom/Google
  // OAuth tokens down to a browser session that doesn't need them - same
  // reasoning as the explicit `select` in consultants.service.ts.
  private readonly adminConsultantSelect = {
    id: true,
    categoryId: true,
    bio: true,
    credentialsInfo: true,
    inPersonAddress: true,
    verificationStatus: true,
    cancellationPolicyHours: true,
    commissionRateOverride: true,
    createdAt: true,
    user: { select: { fullName: true, email: true, createdAt: true, approvalStatus: true } },
    category: true,
  } as const;

  async listConsultants(status?: VerificationStatus) {
    return this.prisma.consultantProfile.findMany({
      where: status ? { verificationStatus: status } : {},
      select: {
        ...this.adminConsultantSelect,
        _count: { select: { serviceTypes: true, bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setVerificationStatus(consultantId: string, status: VerificationStatus) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!profile) throw new NotFoundException('Consultant not found');

    return this.prisma.consultantProfile.update({
      where: { id: consultantId },
      data: { verificationStatus: status },
      select: this.adminConsultantSelect,
    });
  }

  // ---------- User account approval ----------

  private readonly adminUserSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    role: true,
    approvalStatus: true,
    createdAt: true,
  } as const;

  async listUsers(status?: VerificationStatus) {
    return this.prisma.user.findMany({
      where: {
        role: { not: Role.ADMIN },
        ...(status ? { approvalStatus: status } : {}),
      },
      select: this.adminUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setUserApproval(userId: string, status: VerificationStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) {
      throw new BadRequestException(
        'Admin accounts are provisioned with the create-admin script and are not part of this queue',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: status },
      select: this.adminUserSelect,
    });
  }

  // ---------- Commission overrides ----------

  async setConsultantCommissionOverride(consultantId: string, rate: number | null) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
    });
    if (!profile) throw new NotFoundException('Consultant not found');

    return this.prisma.consultantProfile.update({
      where: { id: consultantId },
      data: { commissionRateOverride: rate },
      select: this.adminConsultantSelect,
    });
  }

  async listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async setCategoryCommissionOverride(categoryId: string, rate: number | null) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.category.update({
      where: { id: categoryId },
      data: { commissionRateOverride: rate },
    });
  }

  // ---------- Platform stats ----------

  async getStats() {
    const [
      totalConsultants,
      approvedConsultants,
      pendingConsultants,
      totalClients,
      pendingUsers,
      totalBookings,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.consultantProfile.count(),
      this.prisma.consultantProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.consultantProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
      this.prisma.user.count({
        where: { role: { not: Role.ADMIN }, approvalStatus: 'PENDING' },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.aggregate({
        where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
        _sum: { priceCharged: true, commissionAmount: true },
      }),
    ]);

    return {
      totalConsultants,
      approvedConsultants,
      pendingConsultants,
      totalClients,
      pendingUsers,
      totalBookings,
      // GMV = gross merchandise value: total value of paid/confirmed bookings,
      // before the platform's cut is taken out.
      grossBookingValue: Number(revenueAgg._sum.priceCharged ?? 0),
      totalCommissionEarned: Number(revenueAgg._sum.commissionAmount ?? 0),
    };
  }

  // ---------- Commissions and payment activity ----------
  //
  // Totals and per-booking rows use amounts already stored on Booking
  // (commissionAmount, priceCharged) and Payment (amount, platformFee,
  // consultantPayout). commissionRate is the platform default from
  // COMMISSION_RATE; a booking may have used a category or consultant
  // override, which is already frozen into commissionAmount.

  async getCommissions(limit = 100) {
    const commissionRate = Number(this.config.get('COMMISSION_RATE') ?? 0.15);

    const [bookingAgg, paymentGroups, bookings] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
        _sum: { priceCharged: true, commissionAmount: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true, platformFee: true, consultantPayout: true },
      }),
      this.prisma.booking.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          priceCharged: true,
          commissionAmount: true,
          createdAt: true,
          client: { select: { fullName: true, email: true } },
          consultant: { select: { user: { select: { fullName: true } } } },
          serviceType: { select: { name: true } },
          payment: {
            select: {
              amount: true,
              platformFee: true,
              consultantPayout: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const empty = { count: 0, amount: 0, platformFee: 0, consultantPayout: 0 };
    const paymentsByStatus: Record<PaymentStatus, typeof empty> = {
      PENDING: { ...empty },
      SUCCEEDED: { ...empty },
      FAILED: { ...empty },
      REFUNDED: { ...empty },
    };
    for (const row of paymentGroups) {
      paymentsByStatus[row.status] = {
        count: row._count._all,
        amount: money(row._sum.amount),
        platformFee: money(row._sum.platformFee),
        consultantPayout: money(row._sum.consultantPayout),
      };
    }

    return {
      commissionRate,
      totals: {
        countedBookings: bookingAgg._count,
        grossBookingValue: money(bookingAgg._sum.priceCharged),
        totalCommissionEarned: money(bookingAgg._sum.commissionAmount),
        platformFeesCollected: paymentsByStatus.SUCCEEDED.platformFee,
        consultantPayouts: paymentsByStatus.SUCCEEDED.consultantPayout,
        refundedPlatformFees: paymentsByStatus.REFUNDED.platformFee,
        paymentsByStatus,
      },
      bookings,
    };
  }

  // ---------- Oversight: recent bookings across the platform ----------

  async listRecentBookings(limit = 50) {
    return this.prisma.booking.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { fullName: true, email: true } },
        consultant: { select: { user: { select: { fullName: true } } } },
        serviceType: true,
        payment: true,
      },
    });
  }
}
