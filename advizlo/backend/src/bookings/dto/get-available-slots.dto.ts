import { IsDateString, IsUUID } from 'class-validator';

export class GetAvailableSlotsDto {
  @IsUUID()
  serviceTypeId: string;

  @IsDateString()
  date: string; // "2026-09-03" - interpreted in the consultant's timezone
}
