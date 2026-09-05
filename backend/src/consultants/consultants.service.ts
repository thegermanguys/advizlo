import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewsService } from '../reviews/reviews.service';
import { UpdateConsultantProfileDto } from './dto/update-consultant-profile.dto';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class ConsultantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  // ---------- Profile ----------

  private async getProfileOrThrow(userId: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        'No consultant profile found for this account',
      );
    }
    return profile;
  }

  async getMyProfile(userId: string) {
    return this.prisma.consultantProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        categoryId: true,
        bio: true,
        credentialsInfo: true,
        inPersonAddress: true,
        verificationStatus: true,
        cancellationPolicyHours: true,
        commissionRateOverride: true,
        payoutAccountId: true,
        // Deliberately NOT selecting zoom*/google* token fields here - the
        // frontend gets connection status via GET /video/status instead,
        // which returns booleans rather than raw OAuth tokens.
        category: true,
        serviceTypes: { orderBy: { createdAt: 'asc' } },
        availability: true,
      },
    });
  }

  async updateMyProfile(userId: string, dto: UpdateConsultantProfileDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const profile = await this.getProfileOrThrow(userId);

    return this.prisma.consultantProfile.update({
      where: { id: profile.id },
      data: {
        categoryId: dto.categoryId,
        bio: dto.bio,
        credentialsInfo: dto.credentialsInfo,
        inPersonAddress: dto.inPersonAddress,
        cancellationPolicyHours: dto.cancellationPolicyHours,
      },
      select: {
        id: true,
        categoryId: true,
        bio: true,
        credentialsInfo: true,
        inPersonAddress: true,
        verificationStatus: true,
        cancellationPolicyHours: true,
        commissionRateOverride: true,
        payoutAccountId: true,
        category: true,
      },
    });
  }

  // ---------- Pricing (Service Types) ----------
  //
  // Pricing is fully consultant-controlled: each service type carries its own
  // price and duration. A consultant offering a free first consultation
  // creates a service type (e.g. "Initial Consultation") with price = 0, and
  // a separate paid one (e.g. "Follow-up") for subsequent bookings - or they
  // can charge from the first appointment by simply pricing every service
  // type above 0. There is no platform-enforced "free" rule; it is entirely
  // the consultant's choice, encoded as data (price + isFirstFree label).

  async createServiceType(userId: string, dto: CreateServiceTypeDto) {
    const profile = await this.getProfileOrThrow(userId);

    // If marked as the free-intro offering, price is forced to 0 regardless
    // of what was submitted - keeps the "free means free" guarantee explicit
    // rather than trusting client-submitted price to match the flag.
    const price = dto.isFirstFree ? 0 : dto.price;

    return this.prisma.serviceType.create({
      data: {
        consultantId: profile.id,
        name: dto.name,
        durationMins: dto.durationMins,
        price,
        currency: dto.currency ?? 'USD',
        isFirstFree: dto.isFirstFree ?? false,
        consultationModes: dto.consultationModes,
      },
    });
  }

  async listMyServiceTypes(userId: string) {
    const profile = await this.getProfileOrThrow(userId);
    return this.prisma.serviceType.findMany({
      where: { consultantId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateServiceType(
    userId: string,
    serviceTypeId: string,
    dto: UpdateServiceTypeDto,
  ) {
    const profile = await this.getProfileOrThrow(userId);
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
    });
    if (!serviceType || serviceType.consultantId !== profile.id) {
      throw new ForbiddenException(
        'This service type does not belong to your profile',
      );
    }

    const price =
      dto.isFirstFree === true ? 0 : dto.price ?? undefined;

    return this.prisma.serviceType.update({
      where: { id: serviceTypeId },
      data: {
        name: dto.name,
        durationMins: dto.durationMins,
        price,
        currency: dto.currency,
        isFirstFree: dto.isFirstFree,
        consultationModes: dto.consultationModes,
        active: dto.active,
      },
    });
  }

  async deleteServiceType(userId: string, serviceTypeId: string) {
    const profile = await this.getProfileOrThrow(userId);
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
    });
    if (!serviceType || serviceType.consultantId !== profile.id) {
      throw new ForbiddenException(
        'This service type does not belong to your profile',
      );
    }
    // Soft-delete by deactivating rather than hard-deleting, so historical
    // bookings that reference this service type keep valid data.
    return this.prisma.serviceType.update({
      where: { id: serviceTypeId },
      data: { active: false },
    });
  }

  // ---------- Availability ----------

  async createAvailability(userId: string, dto: CreateAvailabilityDto) {
    const profile = await this.getProfileOrThrow(userId);
    const isRecurring = dto.isRecurring ?? true;

    return this.prisma.availability.create({
      data: {
        consultantId: profile.id,
        dayOfWeek: isRecurring ? dto.dayOfWeek : null,
        specificDate: !isRecurring && dto.specificDate ? new Date(dto.specificDate) : null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isRecurring,
        isBlocked: dto.isBlocked ?? false,
      },
    });
  }

  async listMyAvailability(userId: string) {
    const profile = await this.getProfileOrThrow(userId);
    return this.prisma.availability.findMany({
      where: { consultantId: profile.id },
      orderBy: [{ isRecurring: 'desc' }, { dayOfWeek: 'asc' }, { specificDate: 'asc' }],
    });
  }

  async deleteAvailability(userId: string, availabilityId: string) {
    const profile = await this.getProfileOrThrow(userId);
    const rule = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
    });
    if (!rule || rule.consultantId !== profile.id) {
      throw new ForbiddenException(
        'This availability rule does not belong to your profile',
      );
    }
    return this.prisma.availability.delete({ where: { id: availabilityId } });
  }

  // ---------- Public browse (used by client-side browse/booking) ----------
  //
  // Both queries below use an explicit `select` rather than `include` -
  // deliberately. `include` returns every scalar field on the model, which
  // would leak zoomAccessToken/zoomRefreshToken/googleAccessToken/
  // googleRefreshToken (real OAuth secrets) to anyone calling these
  // unauthenticated public endpoints. Any new ConsultantProfile field added
  // in the future needs a conscious decision about whether it belongs here.

  private readonly publicConsultantSelect = {
    id: true,
    bio: true,
    credentialsInfo: true,
    inPersonAddress: true,
    verificationStatus: true,
    cancellationPolicyHours: true,
    user: { select: { fullName: true } },
    category: true,
    serviceTypes: { where: { active: true } },
  } as const;

  async findPublicById(consultantProfileId: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantProfileId },
      select: this.publicConsultantSelect,
    });
    if (!profile) throw new NotFoundException('Consultant not found');

    // Single-consultant page can afford the fuller call (average + count +
    // the actual review list) - this is what powers the "Reviews" section
    // on the consultant detail page.
    const { averageRating, reviewCount, reviews } =
      await this.reviewsService.getConsultantReviews(consultantProfileId);

    return { ...profile, averageRating, reviewCount, reviews };
  }

  async listPublicByCategory(categoryId?: string) {
    const profiles = await this.prisma.consultantProfile.findMany({
      where: {
        verificationStatus: 'APPROVED',
        ...(categoryId ? { categoryId } : {}),
      },
      select: this.publicConsultantSelect,
    });

    // Browse shows many consultants at once - one grouped query for all of
    // them rather than one aggregate call per card.
    const summaries = await this.reviewsService.getBulkRatingSummaries(
      profiles.map((p) => p.id),
    );

    return profiles.map((p) => ({
      ...p,
      averageRating: summaries[p.id]?.averageRating ?? null,
      reviewCount: summaries[p.id]?.reviewCount ?? 0,
    }));
  }
}
