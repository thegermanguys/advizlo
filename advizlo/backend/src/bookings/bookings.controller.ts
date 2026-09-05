import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetAvailableSlotsDto } from './dto/get-available-slots.dto';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Public: anyone can check a consultant's open slots before signing up.
  @Get('consultants/:consultantId/available-slots')
  getAvailableSlots(
    @Param('consultantId') consultantId: string,
    @Query() query: GetAvailableSlotsDto,
  ) {
    return this.bookingsService.getAvailableSlots(
      consultantId,
      query.serviceTypeId,
      query.date,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Post('bookings')
  createBooking(@CurrentUser() user: { id: string }, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Get('bookings/me')
  listMyBookingsAsClient(@CurrentUser() user: { id: string }) {
    return this.bookingsService.listMyBookingsAsClient(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('bookings/consultant/me')
  listMyBookingsAsConsultant(@CurrentUser() user: { id: string }) {
    return this.bookingsService.listMyBookingsAsConsultant(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bookings/:id/cancel')
  cancelBooking(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id') id: string,
  ) {
    return this.bookingsService.cancelBooking(user, id);
  }
}
