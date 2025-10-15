import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { UserRole } from '../users/entities/user.entity';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.STUDENT,
    });

    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async generate2FASecret(userId: string) {
    const user = await this.usersService.findOne(userId);

    const secret = speakeasy.generateSecret({
      name: `${this.configService.get('TWO_FACTOR_AUTHENTICATION_APP_NAME')} (${user.email})`,
    });

    if (!secret.otpauth_url) {
      throw new InternalServerErrorException('Failed to generate OTP Auth URL for 2FA');
    }

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async enable2FA(userId: string, token: string) {
    const user = await this.usersService.findOne(userId);

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA secret not generated');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    // Usar el método específico en lugar de update genérico
    await this.usersService.enableTwoFactor(userId);

    return { message: '2FA enabled successfully' };
  }

  async disable2FA(userId: string) {
    // Usar el método específico en lugar de update genérico
    await this.usersService.disableTwoFactor(userId);

    return { message: '2FA disabled successfully' };
  }

  async loginWith2FA(verify2FADto: Verify2FADto) {
    const user = await this.usersService.findByEmail(verify2FADto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      verify2FADto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA not enabled for this user');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA secret not configured');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: verify2FADto.token,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}