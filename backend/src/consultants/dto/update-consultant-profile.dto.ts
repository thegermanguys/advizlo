import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ConsultationFeePolicy } from '@prisma/client';

export class UpdateConsultantProfileDto {
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  credentialsInfo?: string;

  @IsOptional()
  @IsString()
  inPersonAddress?: string; // required in practice if any service type offers IN_PERSON

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168) // up to a week's notice
  cancellationPolicyHours?: number;

  // One policy for every meeting this consultant offers. Omitted leaves the
  // stored policy unchanged (CHARGE_FROM_FIRST for consultants created
  // before this field existed).
  @IsOptional()
  @IsEnum(ConsultationFeePolicy)
  consultationFeePolicy?: ConsultationFeePolicy;
}
