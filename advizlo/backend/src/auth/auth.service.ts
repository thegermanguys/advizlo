import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === Role.ADMIN) {
      // Admin accounts are provisioned manually, never via public signup.
      throw new ForbiddenException('Cannot self-register as ADMIN');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        timezone: dto.timezone ?? 'UTC',
      },
    });

    // If they're signing up as a consultant, create the empty profile shell now.
    // categoryId, bio, pricing, and availability get filled in during onboarding
    // (next feature slice), so categoryId is intentionally left unset here.
    if (dto.role === Role.CONSULTANT) {
      await this.prisma.consultantProfile.create({
        data: {
          userId: user.id,
          // A placeholder category is required by the schema's non-null FK;
          // the onboarding flow will let the consultant pick their real one.
          // For now this is deferred - see note in ConsultantProfile module TODO.
          categoryId: await this.getOrCreatePlaceholderCategoryId(),
        },
      });
    }

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  // Temporary helper for the auth-only slice: consultant onboarding (next feature)
  // replaces this by letting the consultant pick a real category and will
  // remove reliance on a placeholder. Kept isolated here so it's obvious
  // where to delete it later.
  private async getOrCreatePlaceholderCategoryId(): Promise<string> {
    const placeholder = await this.prisma.category.upsert({
      where: { name: 'Uncategorized' },
      update: {},
      create: { name: 'Uncategorized' },
    });
    return placeholder.id;
  }
}
