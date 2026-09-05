import {
  Body,
  Controller,
  Delete,
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
import { ConsultantsService } from './consultants.service';
import { UpdateConsultantProfileDto } from './dto/update-consultant-profile.dto';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('consultants')
export class ConsultantsController {
  constructor(private readonly consultantsService: ConsultantsService) {}

  // ---------- Consultant-only: my own profile / pricing / availability ----------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('me/profile')
  getMyProfile(@CurrentUser() user: { id: string }) {
    return this.consultantsService.getMyProfile(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Patch('me/profile')
  updateMyProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateConsultantProfileDto,
  ) {
    return this.consultantsService.updateMyProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Post('me/service-types')
  createServiceType(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateServiceTypeDto,
  ) {
    return this.consultantsService.createServiceType(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('me/service-types')
  listMyServiceTypes(@CurrentUser() user: { id: string }) {
    return this.consultantsService.listMyServiceTypes(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Patch('me/service-types/:id')
  updateServiceType(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateServiceTypeDto,
  ) {
    return this.consultantsService.updateServiceType(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Delete('me/service-types/:id')
  deleteServiceType(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.consultantsService.deleteServiceType(user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Post('me/availability')
  createAvailability(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.consultantsService.createAvailability(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('me/availability')
  listMyAvailability(@CurrentUser() user: { id: string }) {
    return this.consultantsService.listMyAvailability(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Delete('me/availability/:id')
  deleteAvailability(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.consultantsService.deleteAvailability(user.id, id);
  }

  // ---------- Public: browse consultants (used by client-side booking, next slice) ----------

  @Get()
  listPublic(@Query('categoryId') categoryId?: string) {
    return this.consultantsService.listPublicByCategory(categoryId);
  }

  @Get(':id')
  getPublicById(@Param('id') id: string) {
    return this.consultantsService.findPublicById(id);
  }
}
