import type { AdminService } from './admin-service';

export const ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;

// 서비스마다 쿠키를 따로 둔다. 같은 브라우저에서 두 서비스에 각각 로그인할 수 있다.
export function getAdminSessionCookieName(service: AdminService): string {
  return `soine.${service}.admin.sid`;
}

export function getAdminSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_SESSION_SECRET is not defined');
  }

  return 'soine-local-admin-session-secret-change-before-production';
}
