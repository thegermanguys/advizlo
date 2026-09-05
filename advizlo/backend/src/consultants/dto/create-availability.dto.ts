import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/; // "HH:MM" 24h

export class CreateAvailabilityDto {
  // Recurring weekly rule: set dayOfWeek (0=Sunday..6=Saturday), isRecurring=true.
  // One-off override/blocked day: set specificDate, isRecurring=false.
  @ValidateIf((o) => o.isRecurring !== false)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ValidateIf((o) => o.isRecurring === false)
  @IsString()
  specificDate?: string; // ISO date, e.g. "2026-09-01"

  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:MM 24h format' })
  startTime: string;

  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:MM 24h format' })
  endTime: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean; // default true

  // A blocked entry marks the consultant as unavailable (vacation, day off)
  // rather than available - used for one-off overrides on top of the
  // recurring weekly pattern.
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}
