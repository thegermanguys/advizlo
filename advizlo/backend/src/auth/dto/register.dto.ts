import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Client signs up choosing CLIENT; a consultant signs up choosing CONSULTANT.
  // ADMIN accounts are never created through public registration.
  @IsEnum(Role, { message: 'role must be CLIENT or CONSULTANT' })
  role: Role;

  @IsOptional()
  @IsString()
  timezone?: string;
}
