'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { FormField } from '@/components/form-field';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  createKkiruCustomer,
  getKkiruCustomer,
  type KkiruCustomerDetail,
  type KkiruCustomerSummary,
  lookupKkiruCustomer,
  updateKkiruCustomer,
} from '@/lib/kkiru-customers-api';
import { formatPhone, isValidPhone } from '@/lib/phone';

const LIST_PATH = '/kkiru/customers';

const CONTROL_CLASS_NAME =
  'h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60 sm:w-64';

function validateCustomer(name: string, phone: string): string | null {
  if (!name.trim()) {
    return '이름을 입력해 주세요.';
  }

  return isValidPhone(phone) ? null : '연락처를 바르게 입력해 주세요. (예: 010-1234-5678)';
}

type KkiruCustomerFormProps = {
  /** 있으면 수정 폼 */
  customer?: KkiruCustomerDetail;
};

export function KkiruCustomerForm({ customer }: KkiruCustomerFormProps) {
  const router = useRouter();
  const idPrefix = useId();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer ? formatPhone(customer.phone) : '');
  const [errorMessage, setErrorMessage] = useState('');
  const [existing, setExisting] = useState<KkiruCustomerSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelHref = customer ? `${LIST_PATH}/${customer.code}` : LIST_PATH;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExisting(null);

    const invalid = validateCustomer(name, phone);

    if (invalid) {
      setErrorMessage(invalid);
      return;
    }

    const input = { name: name.trim(), phone: phone.replace(/\D/g, '') };
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved = customer
        ? await updateKkiruCustomer(customer.code, input)
        : await createKkiruCustomer(input);
      router.push(`${LIST_PATH}/${saved.code}`);
    } catch (error) {
      setIsSubmitting(false);

      if (error instanceof AdminApiError && error.status === 409) {
        setErrorMessage('이미 이 연락처로 등록된 고객이 있습니다.');
        setExisting(await lookupKkiruCustomer(input.phone).catch(() => null));
        return;
      }

      setErrorMessage(
        error instanceof AdminApiError && error.status === 400
          ? '입력한 내용을 다시 확인해 주세요.'
          : '고객을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
  }

  return (
    <form
      aria-label={customer ? '고객 수정' : '고객 추가'}
      className="border border-[var(--line)] bg-[var(--surface)] px-5 py-5"
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-5" disabled={isSubmitting}>
        <legend className="sr-only">고객 정보</legend>
        <FormField htmlFor={`${idPrefix}-name`} label="이름" required>
          <input
            className={CONTROL_CLASS_NAME}
            id={`${idPrefix}-name`}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </FormField>
        <FormField htmlFor={`${idPrefix}-phone`} label="연락처" required>
          <input
            autoComplete="off"
            className={`${CONTROL_CLASS_NAME} tabular-nums`}
            id={`${idPrefix}-phone`}
            inputMode="tel"
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            placeholder="010-1234-5678"
            required
            type="tel"
            value={phone}
          />
        </FormField>
      </fieldset>

      <footer className="mt-6 flex flex-col gap-3">
        {errorMessage ? (
          <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
            {errorMessage}{' '}
            {existing && existing.code !== customer?.code ? (
              <Link className="underline underline-offset-2" href={`${LIST_PATH}/${existing.code}`}>
                {existing.name} ({existing.code}) 보기
              </Link>
            ) : null}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Link
            className="flex h-10 items-center border border-[var(--line)] px-4 text-sm font-medium hover:bg-[var(--background)]"
            href={cancelHref}
          >
            취소
          </Link>
          <button
            className="h-10 bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </footer>
    </form>
  );
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; customer: KkiruCustomerDetail };

/** 고객을 불러와 그려 준다. 상세·수정 화면이 함께 쓴다. */
export function KkiruCustomerLoader({
  code,
  children,
}: {
  code: string;
  children: (customer: KkiruCustomerDetail) => React.ReactNode;
}) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    getKkiruCustomer(code)
      .then((customer) => {
        if (isActive) {
          setState({ customer, kind: 'loaded' });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState(
            error instanceof AdminApiError && error.status === 404
              ? { kind: 'not-found' }
              : { kind: 'error' },
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [code]);

  if (state.kind === 'loading') {
    return <p className="py-10 text-sm text-[var(--muted)]">고객을 불러오고 있습니다.</p>;
  }

  if (state.kind === 'not-found') {
    return <p className="py-10 text-sm text-[var(--muted)]">해당 고객을 찾을 수 없습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="py-10 text-sm text-[var(--error)]" role="alert">
        고객을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return <>{children(state.customer)}</>;
}
