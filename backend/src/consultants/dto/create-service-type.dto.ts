import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ConsultationMode } from '@prisma/client';

export class CreateServiceTypeDto {
  @IsString()
  @MinLength(2)
  name: string; // e.g. "Initial Consultation", "Follow-up", "Document Review"

  @IsInt()
  @Min(5)
  durationMins: number;

  // A consultant sets this to 0 to offer a free first consultation.
  // There is no separate "free" flag needed beyond isFirstFree - price can
  // simply be 0 for any service type, at the consultant's discretion.
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string; // default USD, set server-side if omitted

  // If true, this specific service type is only charged from the client's
  // 2nd booking with this consultant onward - see ServiceType pricing logic
  // in consultants.service.ts (resolvePriceForBooking).
  @IsOptional()
  @IsBoolean()
  isFirstFree?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ConsultationMode, { each: true })
  consultationModes: ConsultationMode[];
}
