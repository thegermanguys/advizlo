import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        emailVerifiedAt: true,
        // Metadata only — the bytes stay out of every authenticated request.
        profilePhoto: { select: { mime: true, updatedAt: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const { emailVerifiedAt, ...rest } = user;
    // Attached to req.user by passport; kept minimal on purpose.
    return { ...rest, emailVerified: emailVerifiedAt != null };
  }
}
