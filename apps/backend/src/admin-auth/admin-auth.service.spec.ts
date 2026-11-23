import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import type { PrismaService } from '../prisma/prisma.service';
import {
  AdminAuthService,
  LOGIN_LOCK_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from './admin-auth.service';

const PASSWORD = 'correct-password';

type AdminRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
};

describe('AdminAuthService', () => {
  let passwordHash: string;
  let admin: AdminRecord;
  let choidolsang: { findUnique: jest.Mock; update: jest.Mock };
  let kkiru: { findUnique: jest.Mock; update: jest.Mock };
  let service: AdminAuthService;
  const now = new Date('2026-11-23T00:00:00.000Z');

  beforeAll(async () => {
    passwordHash = await argon2.hash(PASSWORD);
  });

  beforeEach(() => {
    admin = {
      email: 'admin@choidolsang.local',
      failedLoginAttempts: 0,
      id: 'admin-1',
      isActive: true,
      lockedUntil: null,
      name: '관리자',
      passwordHash,
    };
    choidolsang = {
      findUnique: jest.fn(() => Promise.resolve(admin)),
      update: jest.fn(() =>
        Promise.resolve({ failedLoginAttempts: admin.failedLoginAttempts + 1 }),
      ),
    };
    kkiru = {
      findUnique: jest.fn(() => Promise.resolve(null)),
      update: jest.fn(),
    };
    const prisma = { choidolsangAdmin: choidolsang, kkiruAdmin: kkiru } as unknown as PrismaService;
    service = new AdminAuthService(prisma);
  });

  it('returns the profile for the service and normalizes the email', async () => {
    await expect(
      service.login('choidolsang', '  Admin@Choidolsang.LOCAL ', PASSWORD, now),
    ).resolves.toEqual({
      email: 'admin@choidolsang.local',
      id: 'admin-1',
      name: '관리자',
      service: 'choidolsang',
    });
    expect(choidolsang.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@choidolsang.local' },
    });
  });

  it('does not accept a choidolsang account on kkiru', async () => {
    await expect(service.login('kkiru', admin.email, PASSWORD, now)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(kkiru.findUnique).toHaveBeenCalled();
    expect(choidolsang.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a wrong password and counts the failure', async () => {
    await expect(service.login('choidolsang', admin.email, 'wrong', now)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(choidolsang.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failedLoginAttempts: { increment: 1 } } }),
    );
  });

  it('locks the account after too many failures', async () => {
    choidolsang.update.mockResolvedValueOnce({ failedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS });

    await expect(service.login('choidolsang', admin.email, 'wrong', now)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(choidolsang.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(now.getTime() + LOGIN_LOCK_DURATION_MS),
        },
        where: { id: 'admin-1' },
      }),
    );
  });

  it('rejects a locked account even with the right password', async () => {
    admin.lockedUntil = new Date(now.getTime() + 1000);

    const error = await service
      .login('choidolsang', admin.email, PASSWORD, now)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
  });

  it('rejects an inactive account', async () => {
    admin.isActive = false;

    await expect(service.login('choidolsang', admin.email, PASSWORD, now)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
