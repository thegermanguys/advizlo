import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        timezone: true,
        createdAt: true,
        emailVerifiedAt: true,
        profilePhoto: { select: { mime: true, updatedAt: true } },
        consultantProfile: {
          select: {
            id: true,
            categoryId: true,
            bio: true,
            verificationStatus: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.withEmailVerified(user);
  }

  async updateProfile(userId: string, dto: UpdateMeDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        timezone: true,
        emailVerifiedAt: true,
        profilePhoto: { select: { mime: true, updatedAt: true } },
      },
    });
    return this.withEmailVerified(updated);
  }

  private withEmailVerified<T extends { emailVerifiedAt: Date | null }>(user: T) {
    const { emailVerifiedAt, ...rest } = user;
    return { ...rest, emailVerified: emailVerifiedAt != null };
  }

  async setProfilePhoto(userId: string, bytes: Buffer, mime: string) {
    return this.prisma.userProfilePhoto.upsert({
      where: { userId },
      create: { userId, data: bytes, mime },
      update: { data: bytes, mime },
      select: { mime: true, updatedAt: true },
    });
  }

  async getProfilePhoto(userId: string) {
    const photo = await this.prisma.userProfilePhoto.findUnique({
      where: { userId },
      select: { data: true, mime: true },
    });
    if (!photo) throw new NotFoundException('Profile photo not found');
    return photo;
  }
}
