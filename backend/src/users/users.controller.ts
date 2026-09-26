import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Put,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { readProfilePhoto } from '../profile-photo/profile-photo';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateMeDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // Replaces the signed-in account's photo. Body is the image bytes
  // (Content-Type image/jpeg, image/png, or image/webp), not JSON.
  @UseGuards(JwtAuthGuard)
  @Put('me/photo')
  setMyPhoto(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const photo = readProfilePhoto(req.body, req.header('content-type'));
    return this.usersService.setProfilePhoto(user.id, photo.bytes, photo.mime);
  }

  // Public so an <img> can load it without an Authorization header.
  // The id is the user id. Missing photo is 404.
  @Get(':id/photo')
  @Header('Cache-Control', 'public, max-age=31536000')
  @Header('X-Content-Type-Options', 'nosniff')
  async getPhoto(@Param('id') id: string): Promise<StreamableFile> {
    const photo = await this.usersService.getProfilePhoto(id);
    return new StreamableFile(Buffer.from(photo.data), {
      type: photo.mime,
      disposition: `inline; filename="profile.${extensionFor(photo.mime)}"`,
    });
  }
}

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}
