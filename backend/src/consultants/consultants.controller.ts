import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
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
import { readProfilePhoto } from '../profile-photo/profile-photo';

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

  // Replaces this consultant's public photo (also the business photo — there
  // is no separate business record). Body is the image bytes, not JSON.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Put('me/photo')
  setMyPhoto(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const photo = readProfilePhoto(req.body, req.header('content-type'));
    return this.consultantsService.setMyPhoto(user.id, photo.bytes, photo.mime);
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

  // Public so browse cards and the consultant page can use a plain <img>.
  // :id is the consultant profile id, same as GET /consultants/:id.
  @Get(':id/photo')
  @Header('Cache-Control', 'public, max-age=31536000')
  @Header('X-Content-Type-Options', 'nosniff')
  async getPhoto(@Param('id') id: string): Promise<StreamableFile> {
    const photo = await this.consultantsService.getProfilePhoto(id);
    const ext = photo.mime === 'image/png' ? 'png' : photo.mime === 'image/webp' ? 'webp' : 'jpg';
    return new StreamableFile(Buffer.from(photo.data), {
      type: photo.mime,
      disposition: `inline; filename="profile.${ext}"`,
    });
  }
}
