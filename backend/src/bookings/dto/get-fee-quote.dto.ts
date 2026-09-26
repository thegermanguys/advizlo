import { IsUUID } from 'class-validator';

export class GetFeeQuoteDto {
  @IsUUID()
  serviceTypeId: string;
}
