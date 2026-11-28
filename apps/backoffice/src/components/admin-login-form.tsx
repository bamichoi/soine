'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, type KeyboardEvent, useId, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import {
  ADMIN_SERVICE_LABELS,
  ADMIN_SERVICES,
  AdminApiError,
  type AdminService,
  loginAdmin,
} from '@/lib/admin-auth-api';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;

const INPUT_CLASS_NAME =
  'h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-60';

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 401) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }

    if (error.status === 403) {
      return '사용이 중지된 계정입니다.';
    }

    if (error.status === 429) {
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  return '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

type AdminLoginFormProps = {
  initialService: AdminService;
};

export function AdminLoginForm({ initialService }: AdminLoginFormProps) {
  const router = useRouter();
  const idPrefix = useId();
  const panelId = `${idPrefix}-panel`;
  const tabRefs = useRef<Partial<Record<AdminService, HTMLButtonElement | null>>>({});
  const [service, setService] = useState<AdminService>(initialService);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectService(nextService: AdminService) {
    setService(nextService);
    setErrorMessage('');
  }

  // 탭 목록에서 좌우 화살표로 탭을 이동한다 (WAI-ARIA tabs 패턴).
  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const index = ADMIN_SERVICES.indexOf(service);
    const nextService =
      ADMIN_SERVICES[(index + offset + ADMIN_SERVICES.length) % ADMIN_SERVICES.length];
    selectService(nextService);
    tabRefs.current[nextService]?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await loginAdmin(service, email.trim(), password);
      router.replace(`/${service}`);
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div
        aria-label="비즈니스 선택"
        className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-[var(--background)] p-1"
        role="tablist"
      >
        {ADMIN_SERVICES.map((tabService) => {
          const isSelected = tabService === service;

          return (
            <button
              aria-controls={panelId}
              aria-selected={isSelected}
              className={`h-9 rounded-md text-sm font-medium transition disabled:opacity-60 ${
                isSelected
                  ? 'bg-[var(--surface)] text-[var(--brand)] shadow-(--shadow-xs)'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
              disabled={isSubmitting}
              id={`${idPrefix}-tab-${tabService}`}
              key={tabService}
              onClick={() => selectService(tabService)}
              onKeyDown={handleTabKeyDown}
              ref={(element) => {
                tabRefs.current[tabService] = element;
              }}
              role="tab"
              tabIndex={isSelected ? 0 : -1}
              type="button"
            >
              {ADMIN_SERVICE_LABELS[tabService]}
            </button>
          );
        })}
      </div>

      <form
        aria-labelledby={`${idPrefix}-tab-${service}`}
        className="flex flex-col gap-5"
        id={panelId}
        onSubmit={handleSubmit}
        role="tabpanel"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">이메일</span>
          <input
            autoComplete="username"
            className={INPUT_CLASS_NAME}
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
              className={`${INPUT_CLASS_NAME} pr-12`}
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
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:text-[var(--brand)] focus-visible:outline-none"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              title={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
              type="button"
            >
              <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} />
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
          className="mt-1 h-11 rounded-md bg-[var(--brand)] font-semibold text-[var(--on-accent)] transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
