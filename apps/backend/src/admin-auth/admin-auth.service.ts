import { randomBytes } from 'node:crypto';
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import type { AdminService } from '../admin-session/admin-service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../prisma/prisma.service';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_DURATION_MS = 1000 * 60 * 15;

export type AdminProfile = {
  id: string;
  email: string;
  name: string;
  service: AdminService;
};

type AdminRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

type AdminUpdate = {
  failedLoginAttempts?: number | { increment: number };
  lockedUntil?: Date | null;
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 서비스별 계정은 각자의 스키마(choidolsang.admins, kkiru.admins)에 있고 서로 공유하지 않는다.
@Injectable()
export class AdminAuthService {
  // 없는 이메일도 해시 검증 시간을 맞춰 계정 존재 여부가 응답 시간으로 드러나지 않게 한다.
  private dummyHash: Promise<string> | undefined;

  constructor(private readonly prisma: PrismaService) {}

  async login(
    service: AdminService,
    email: string,
    password: string,
    now = new Date(),
  ): Promise<AdminProfile> {
    const admin = await this.findAdmin(service, { email: normalizeEmail(email) });

    if (!admin) {
      await argon2.verify(await this.getDummyHash(), password).catch(() => false);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (admin.lockedUntil && admin.lockedUntil > now) {
      throw new HttpException('Too many failed login attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    const isPasswordValid = await argon2.verify(admin.passwordHash, password).catch(() => false);

    if (!isPasswordValid) {
      await this.recordFailedLogin(service, admin.id, now);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!admin.isActive) {
      throw new ForbiddenException('Admin account is inactive');
    }

    if (admin.failedLoginAttempts > 0 || admin.lockedUntil) {
      await this.updateAdmin(service, admin.id, { failedLoginAttempts: 0, lockedUntil: null });
    }

    return toProfile(service, admin);
  }

  async findActiveProfile(service: AdminService, adminId: string): Promise<AdminProfile | null> {
    const admin = await this.findAdmin(service, { id: adminId });

    return admin?.isActive ? toProfile(service, admin) : null;
  }

  private async recordFailedLogin(service: AdminService, adminId: string, now: Date) {
    const { failedLoginAttempts } = await this.updateAdmin(service, adminId, {
      failedLoginAttempts: { increment: 1 },
    });

    if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.updateAdmin(service, adminId, {
        failedLoginAttempts: 0,
        lockedUntil: new Date(now.getTime() + LOGIN_LOCK_DURATION_MS),
      });
    }
  }

  private findAdmin(
    service: AdminService,
    where: { email: string } | { id: string },
  ): Promise<AdminRecord | null> {
    return service === 'choidolsang'
      ? this.prisma.choidolsangAdmin.findUnique({ where })
      : this.prisma.kkiruAdmin.findUnique({ where });
  }

  private updateAdmin(
    service: AdminService,
    id: string,
    data: AdminUpdate,
  ): Promise<{ failedLoginAttempts: number }> {
    const select = { failedLoginAttempts: true } as const;

    return service === 'choidolsang'
      ? this.prisma.choidolsangAdmin.update({ data, select, where: { id } })
      : this.prisma.kkiruAdmin.update({ data, select, where: { id } });
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash(randomBytes(32).toString('base64url'));
    return this.dummyHash;
  }
}

function toProfile(service: AdminService, admin: AdminRecord): AdminProfile {
  return { email: admin.email, id: admin.id, name: admin.name, service };
}
