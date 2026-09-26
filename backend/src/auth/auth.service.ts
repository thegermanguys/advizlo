import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === Role.ADMIN) {
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

    if (dto.role === Role.CONSULTANT) {
      // verificationStatus stays PENDING (schema default). An admin approves
      // the consultant on /admin. Clients have no approval step.
      await this.prisma.consultantProfile.create({
        data: {
          userId: user.id,
          categoryId: await this.getOrCreatePlaceholderCategoryId(),
        },
      });
    }

    if (dto.role === Role.CLIENT) {
      await this.issueEmailVerification(user.id, user.email);
    }

    // Already emails ADMIN_EMAIL for a new consultant (and a new client).
    await this.emailService.notifyAdminOfNewAccount({
      email: user.email,
      role: user.role,
    });

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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const webAppUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
      const resetLink = `${webAppUrl}/reset-password?token=${rawToken}`;

      await this.emailService.sendPasswordResetEmail(user.email, resetLink);
    }

    return { message: 'If that email has an account, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated. You can now log in with your new password.' };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      throw new BadRequestException('This verification link is invalid or has expired');
    }

    if (record.usedAt) {
      const user = await this.prisma.user.findUnique({
        where: { id: record.userId },
        select: { emailVerifiedAt: true },
      });
      if (user?.emailVerifiedAt) {
        return { message: 'Email verified. You can book consultations.' };
      }
      throw new BadRequestException('This verification link is invalid or has expired');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('This verification link is invalid or has expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified. You can book consultations.' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role !== Role.CLIENT) {
      return { message: 'This account does not need email verification.' };
    }
    if (user.emailVerifiedAt) {
      return { message: 'This email is already verified.' };
    }

    await this.issueEmailVerification(user.id, user.email);
    return { message: 'A new verification link has been sent.' };
  }

  private async issueEmailVerification(userId: string, email: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + VERIFY_EMAIL_TTL_MS),
      },
    });

    const webAppUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
    const verifyLink = `${webAppUrl}/verify-email?token=${rawToken}`;
    await this.emailService.sendEmailVerificationEmail(email, verifyLink);
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    emailVerifiedAt?: Date | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerifiedAt != null,
      },
    };
  }

  private async getOrCreatePlaceholderCategoryId(): Promise<string> {
    const placeholder = await this.prisma.category.upsert({
      where: { name: 'Uncategorized' },
      update: {},
      create: { name: 'Uncategorized' },
    });
    return placeholder.id;
  }
}
