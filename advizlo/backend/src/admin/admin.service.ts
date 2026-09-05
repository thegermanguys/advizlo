import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
    user: { select: { fullName: true, email: true, createdAt: true } },
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
      totalBookings,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.consultantProfile.count(),
      this.prisma.consultantProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.consultantProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
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
      totalBookings,
      // GMV = gross merchandise value: total value of paid/confirmed bookings,
      // before the platform's cut is taken out.
      grossBookingValue: Number(revenueAgg._sum.priceCharged ?? 0),
      totalCommissionEarned: Number(revenueAgg._sum.commissionAmount ?? 0),
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
