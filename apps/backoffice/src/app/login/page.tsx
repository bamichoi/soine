import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/admin-login-form';

export const metadata: Metadata = {
  title: '로그인 | Backoffice',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">관리자 로그인</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">관리자 계정으로 로그인해 주세요.</p>
        </header>
        <AdminLoginForm />
      </section>
    </main>
  );
}
