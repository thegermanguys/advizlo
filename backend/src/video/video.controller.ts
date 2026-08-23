import { BadRequestException, Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from './video.service';

@Controller('video')
export class VideoController {
  private readonly webAppUrl: string;

  constructor(
    private readonly videoService: VideoService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.webAppUrl = config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('status')
  getStatus(@CurrentUser() user: { id: string }) {
    return this.videoService.getStatus(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('zoom/connect')
  async connectZoom(@CurrentUser() user: { id: string }) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) throw new BadRequestException('No consultant profile found');
    return { url: this.videoService.getZoomAuthorizeUrl(profile.id) };
  }

  // Zoom redirects the consultant's browser here directly - no JWT on this
  // request, hence the signed `state` param (see video.service.ts).
  @Get('zoom/callback')
  async zoomCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.videoService.handleZoomCallback(code, state);
      res.redirect(`${this.webAppUrl}/onboarding/video?zoom=connected`);
    } catch {
      res.redirect(`${this.webAppUrl}/onboarding/video?zoom=error`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSULTANT)
  @Get('google/connect')
  async connectGoogle(@CurrentUser() user: { id: string }) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) throw new BadRequestException('No consultant profile found');
    return { url: this.videoService.getGoogleAuthorizeUrl(profile.id) };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.videoService.handleGoogleCallback(code, state);
      res.redirect(`${this.webAppUrl}/onboarding/video?google=connected`);
    } catch {
      res.redirect(`${this.webAppUrl}/onboarding/video?google=error`);
    }
  }
}
