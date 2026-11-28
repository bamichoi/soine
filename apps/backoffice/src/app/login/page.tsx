import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/admin-login-form';
import { ThemeMenu } from '@/components/theme-menu';
import { isAdminService } from '@/lib/admin-auth-api';

export const metadata: Metadata = {
  title: '로그인 | Backoffice',
};

type LoginPageProps = {
  searchParams: Promise<{ service?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { service } = await searchParams;
  const initialService = isAdminService(service) ? service : 'choidolsang';

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="fixed top-4 right-4">
        <ThemeMenu size="md" />
      </div>
      <section className="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-(--shadow-xs)">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">관리자 로그인</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            비즈니스를 선택하고 관리자 계정으로 로그인해 주세요.
          </p>
        </header>
        <AdminLoginForm initialService={initialService} />
      </section>
    </main>
  );
}
