import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UpdateConsultantProfileDto {
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

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
}
