// 백오피스 관리자 인증 API 클라이언트.
// 요청은 next.config.ts의 rewrite로 백엔드 `/admin/*`에 전달된다.
// 계정과 세션은 서비스별로 분리되어 있다. 계약: docs/adr/ADR-0003-서비스별-관리자-계정과-세션.md

export const ADMIN_SERVICES = ['choidolsang', 'goodplace'] as const;

export type AdminService = (typeof ADMIN_SERVICES)[number];

export const ADMIN_SERVICE_LABELS: Record<AdminService, string> = {
  choidolsang: '초이돌상',
  goodplace: '굿플레이스',
};

export function isAdminService(value: unknown): value is AdminService {
  return typeof value === 'string' && (ADMIN_SERVICES as readonly string[]).includes(value);
}

export type AdminProfile = {
  id: string;
  email: string;
  name: string;
  service: AdminService;
};

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function requestAdminApi(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`/api/admin/${path}`, { credentials: 'include', ...init });

  if (!response.ok) {
    throw new AdminApiError(response.status, response.statusText);
  }

  return response;
}

export async function loginAdmin(
  service: AdminService,
  email: string,
  password: string,
): Promise<AdminProfile> {
  const response = await requestAdminApi(`${service}/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return (await response.json()) as AdminProfile;
}

export async function getCurrentAdmin(service: AdminService): Promise<AdminProfile> {
  const response = await requestAdminApi(`${service}/auth/me`);

  return (await response.json()) as AdminProfile;
}

export async function logoutAdmin(service: AdminService): Promise<void> {
  await requestAdminApi(`${service}/auth/logout`, { method: 'POST' });
}
