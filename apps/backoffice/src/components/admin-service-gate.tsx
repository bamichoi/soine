'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ADMIN_SERVICE_LABELS,
  AdminApiError,
  type AdminProfile,
  type AdminService,
  getCurrentAdmin,
  logoutAdmin,
} from '@/lib/admin-auth-api';

type AdminServiceGateProps = {
  service: AdminService;
  children: ReactNode;
};

// 해당 서비스에 로그인했는지 확인한 뒤에만 화면을 보여준다.
// 실제 접근 제어는 백엔드가 강제하며, 이 컴포넌트는 화면 이동(UX)만 담당한다.
export function AdminServiceGate({ service, children }: AdminServiceGateProps) {
  const router = useRouter();
  const loginPath = `/login?service=${service}`;
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isActive = true;

    getCurrentAdmin(service)
      .then((profile) => {
        if (isActive) {
          setAdmin(profile);
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        if (error instanceof AdminApiError && error.status === 401) {
          router.replace(loginPath);
          return;
        }

        setErrorMessage('관리자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      });

    return () => {
      isActive = false;
    };
  }, [router, service, loginPath]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logoutAdmin(service);
    } finally {
      router.replace(loginPath);
    }
  }

  if (errorMessage) {
    return (
      <p className="p-8 text-sm text-[var(--error)]" role="alert">
        {errorMessage}
      </p>
    );
  }

  if (!admin) {
    return <p className="p-8 text-sm text-[var(--muted)]">로그인 정보를 확인하고 있습니다.</p>;
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-6 py-3">
        <span className="text-sm font-semibold text-[var(--brand)]">
          {ADMIN_SERVICE_LABELS[service]}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--muted)]">{admin.name}</span>
          <button
            className="rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-strong)] disabled:opacity-60"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            로그아웃
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
