import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AdminAuthService } from './admin-auth.service';
import { AdminSessionGuard } from './admin-session.guard';

function createContext(session: { adminId?: string } | undefined): ExecutionContext {
  return {
    getClass: () => class {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ session }) }),
  } as unknown as ExecutionContext;
}

describe('AdminSessionGuard', () => {
  let findActiveProfile: jest.Mock;
  let guard: AdminSessionGuard;

  beforeEach(() => {
    findActiveProfile = jest.fn();
    const reflector = { getAllAndOverride: jest.fn(() => 'choidolsang') } as unknown as Reflector;
    guard = new AdminSessionGuard(reflector, { findActiveProfile } as unknown as AdminAuthService);
  });

  it('rejects a request without a session admin', async () => {
    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findActiveProfile).not.toHaveBeenCalled();
  });

  it('rejects an admin that is no longer active in the service', async () => {
    findActiveProfile.mockResolvedValue(null);

    await expect(guard.canActivate(createContext({ adminId: 'admin-1' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findActiveProfile).toHaveBeenCalledWith('choidolsang', 'admin-1');
  });

  it('allows an active admin of the service', async () => {
    findActiveProfile.mockResolvedValue({ id: 'admin-1' });

    await expect(guard.canActivate(createContext({ adminId: 'admin-1' }))).resolves.toBe(true);
  });
});
