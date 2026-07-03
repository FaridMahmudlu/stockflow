import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from '../../common/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.role, user.email);
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    // Find the token in the database
    // Note: In a real-world scenario with high traffic, scanning tokenHash with bcrypt.compare might be slow.
    // However, per SPEC, we hash it before storing. We must retrieve all valid tokens for the user?
    // Wait, the SPEC says: "opaque random string... hashed with bcrypt before storing". 
    // To find it efficiently, we typically send the token id along with the secret, or we hash it with a fast hash like SHA256 before storing.
    // Since SPEC specifically says bcrypt, and we only receive the raw token, we have to find the user first. 
    // Wait, the client only sends `refreshToken`. We cannot find the user without decoding it. 
    // Usually, the refresh token is structured as `userId.randomString`. Let's assume the token sent by client contains userId.
    // Let's decode the userId from the token string.
    const [userId, rawToken] = refreshToken.split('.');
    
    if (!userId || !rawToken) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let matchedToken = null;
    for (const token of activeTokens) {
      const isMatch = await bcrypt.compare(rawToken, token.tokenHash);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke the old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer active');
    }

    return this.generateTokens(user.id, user.role, user.email);
  }

  async logout(userId: string) {
    // Revoke all active refresh tokens for the user (or optionally just the one used, but for security, revoke all is safer)
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    // Create an audit log per SPEC.md Section 7 / Section 8
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: userId,
      },
    });

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string, role: string, email: string) {
    const payload: JwtPayload = { sub: userId, role: role as any, email };

    const accessToken = this.jwtService.sign(payload);

    // Generate opaque refresh token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = `${userId}.${rawToken}`; // Prefix with userId for easier DB lookup

    // Hash refresh token
    const saltRoundsStr = this.configService.get<string>('BCRYPT_SALT_ROUNDS');
    const saltRounds = saltRoundsStr ? parseInt(saltRoundsStr, 10) : 12;
    const tokenHash = await bcrypt.hash(rawToken, saltRounds);

    const expiryDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRY') || '30');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    // Create an audit log for LOGIN
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGIN',
        entityType: 'User',
        entityId: userId,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async registerDeviceToken(userId: string, token: string, platform?: string) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }
}
