import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { VideoModule } from '../video/video.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [VideoModule, PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
