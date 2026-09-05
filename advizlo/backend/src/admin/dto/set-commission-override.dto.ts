import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SetCommissionOverrideDto {
  // 0 to 1 (e.g. 0.1 = 10%). Omit or send null to clear the override and
  // fall back to the next level (category, then the global default).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRateOverride: number | null;
}
