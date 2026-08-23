import { IsEnum, IsISO8601, IsUUID } from 'class-validator';
import { ConsultationMode } from '@prisma/client';

export class CreateBookingDto {
  @IsUUID()
  consultantId: string; // ConsultantProfile.id

  @IsUUID()
  serviceTypeId: string;

  @IsISO8601()
  scheduledAt: string; // full ISO datetime, e.g. "2026-09-03T14:00:00.000Z"

  @IsEnum(ConsultationMode)
  consultationMode: ConsultationMode;
}
