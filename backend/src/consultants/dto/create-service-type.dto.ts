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

  // List price for this consultation type. Whether a given meeting actually
  // charges it depends on the consultant's ConsultationFeePolicy
  // (see bookings.service.ts). 0 means this type is free even when the
  // policy would otherwise charge.
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string; // default USD, set server-side if omitted

  // Legacy per-type flag: forces the stored list price to 0. The consultant's
  // fee policy (first free / all free / charge from the first meeting) is
  // separate and lives on ConsultantProfile.
  @IsOptional()
  @IsBoolean()
  isFirstFree?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ConsultationMode, { each: true })
  consultationModes: ConsultationMode[];
}
