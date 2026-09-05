import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Creation ----------
  //
  // Eligibility is intentionally strict and simple: only the client on a
  // COMPLETED booking can review it, exactly once. bookingId is @unique on
  // Review at the schema level too, so this is enforced in two layers - the
  // service check gives a clear error message, the DB constraint is the
  // backstop against races (e.g. a double-submit).

  async createReview(clientId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('This booking does not belong to you');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        `You can only review a completed booking (this one is ${booking.status})`,
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) {
      throw new BadRequestException('You have already reviewed this booking');
    }

    return this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        clientId,
        consultantId: booking.consultantId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  // ---------- Public listing (single consultant) ----------

  async getConsultantReviews(consultantId: string) {
    const [reviews, summary] = await Promise.all([
      this.prisma.review.findMany({
        where: { consultantId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          // Only the reviewer's name - never email or other client fields on
          // a public-facing endpoint. Matches the explicit-select pattern
          // used everywhere else public data is served in this codebase.
          client: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.aggregate({
        where: { consultantId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      averageRating: summary._avg.rating,
      reviewCount: summary._count.rating,
      reviews,
    };
  }

  // ---------- Bulk rating summaries (Browse page - many consultants at once) ----------

  async getBulkRatingSummaries(
    consultantIds: string[],
  ): Promise<Record<string, { averageRating: number; reviewCount: number }>> {
    if (consultantIds.length === 0) return {};

    const rows = await this.prisma.review.groupBy({
      by: ['consultantId'],
      where: { consultantId: { in: consultantIds } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const summaries: Record<string, { averageRating: number; reviewCount: number }> = {};
    for (const row of rows) {
      summaries[row.consultantId] = {
        averageRating: row._avg.rating ?? 0,
        reviewCount: row._count.rating,
      };
    }
    return summaries;
  }
}
