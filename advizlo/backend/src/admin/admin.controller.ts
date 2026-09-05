import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role, VerificationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { SetVerificationStatusDto } from './dto/set-verification-status.dto';
import { SetCommissionOverrideDto } from './dto/set-commission-override.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('consultants')
  listConsultants(@Query('status') status?: VerificationStatus) {
    return this.adminService.listConsultants(status);
  }

  @Patch('consultants/:id/verification')
  setVerificationStatus(
    @Param('id') id: string,
    @Body() dto: SetVerificationStatusDto,
  ) {
    return this.adminService.setVerificationStatus(id, dto.status);
  }

  @Patch('consultants/:id/commission')
  setConsultantCommission(
    @Param('id') id: string,
    @Body() dto: SetCommissionOverrideDto,
  ) {
    return this.adminService.setConsultantCommissionOverride(
      id,
      dto.commissionRateOverride,
    );
  }

  @Get('categories')
  listCategories() {
    return this.adminService.listCategories();
  }

  @Patch('categories/:id/commission')
  setCategoryCommission(
    @Param('id') id: string,
    @Body() dto: SetCommissionOverrideDto,
  ) {
    return this.adminService.setCategoryCommissionOverride(
      id,
      dto.commissionRateOverride,
    );
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('bookings')
  listRecentBookings() {
    return this.adminService.listRecentBookings();
  }
}
