'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { AdminApiError, getPostLoginPath, loginAdmin } from '@/lib/admin-auth-api';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 401) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }

    if (error.status === 403) {
      return '접근 권한이 없는 계정입니다.';
    }

    if (error.status === 429) {
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  return '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const { services } = await loginAdmin(email.trim(), password);
      router.replace(getPostLoginPath(services));
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">이메일</span>
        <input
          autoComplete="username"
          className="h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-60"
          disabled={isSubmitting}
          inputMode="email"
          maxLength={EMAIL_MAX_LENGTH}
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">비밀번호</span>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 pr-16 text-base outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-60"
            disabled={isSubmitting}
            maxLength={PASSWORD_MAX_LENGTH}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type={isPasswordVisible ? 'text' : 'password'}
            value={password}
          />
          <button
            aria-label={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
            aria-pressed={isPasswordVisible}
            className="absolute inset-y-0 right-0 px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            {isPasswordVisible ? '숨기기' : '보기'}
          </button>
        </div>
      </label>

      {errorMessage ? (
        <p
          className="rounded-md bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        className="mt-1 h-11 rounded-md bg-[var(--brand)] font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}
