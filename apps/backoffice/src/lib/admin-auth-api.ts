// 백오피스 관리자 인증 API 클라이언트.
// 요청은 next.config.ts의 rewrite로 백엔드 `/admin/*`에 전달된다.
// 백엔드 로그인 API는 아직 없다. 계약은 인증 ADR에서 확정한다.

export type AdminService = 'choidolsang' | 'kkiru';

export type AdminLoginResponse = {
  services: AdminService[];
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

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  const response = await fetch('/api/admin/auth/login', {
    body: JSON.stringify({ email, password }),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new AdminApiError(response.status, response.statusText);
  }

  return (await response.json()) as AdminLoginResponse;
}

// 로그인 후 이동할 경로. 소속 서비스가 둘 이상이면 서비스 선택 화면으로 보낸다.
export function getPostLoginPath(services: AdminService[]): string {
  if (services.length === 1) {
    return `/${services[0]}`;
  }

  return '/select-service';
}
