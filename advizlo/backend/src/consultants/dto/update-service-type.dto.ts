import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServiceTypeDto } from './create-service-type.dto';

export class UpdateServiceTypeDto extends PartialType(CreateServiceTypeDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean; // consultant can deactivate a service type without deleting history
}
