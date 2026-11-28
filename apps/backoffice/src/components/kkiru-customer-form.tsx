'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { FormField } from '@/components/form-field';
import { KkiruLoader } from '@/components/kkiru-loader';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  createKkiruCustomer,
  getKkiruCustomer,
  type KkiruCustomerDetail,
  type KkiruCustomerSummary,
  lookupKkiruCustomer,
  updateKkiruCustomer,
} from '@/lib/kkiru-customers-api';
import {
  ERROR_BOX_CLASS_NAME,
  FOCUS_CLASS_NAME,
  HERO_CLASS_NAME,
  INPUT_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/kkiru-ui';
import { formatPhone, isValidMobilePhone } from '@/lib/phone';

const LIST_PATH = '/kkiru/customers';

function validateCustomer(name: string, phone: string): string | null {
  if (!name.trim()) {
    return '이름을 입력해 주세요.';
  }

  return isValidMobilePhone(phone) ? null : '연락처를 010-0000-0000 형식으로 입력해 주세요.';
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
  const [memo, setMemo] = useState(customer?.memo ?? '');
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

    const input = { memo: memo.trim() || null, name: name.trim(), phone: phone.replace(/\D/g, '') };
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
      aria-label={customer ? '고객 수정' : '새 고객'}
      className={HERO_CLASS_NAME}
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-5" disabled={isSubmitting}>
        <legend className="sr-only">고객 정보</legend>
        <FormField look="kkiru" htmlFor={`${idPrefix}-name`} label="이름" required>
          <input
            className={`${INPUT_CLASS_NAME} sm:w-64`}
            id={`${idPrefix}-name`}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </FormField>
        <FormField look="kkiru" htmlFor={`${idPrefix}-phone`} label="연락처" required>
          <input
            autoComplete="off"
            className={`${INPUT_CLASS_NAME} tabular-nums sm:w-64`}
            id={`${idPrefix}-phone`}
            inputMode="tel"
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            placeholder="010-1234-5678"
            required
            type="tel"
            value={phone}
          />
        </FormField>
        <FormField look="kkiru" htmlFor={`${idPrefix}-memo`} label="고객 메모">
          <textarea
            className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-28`}
            id={`${idPrefix}-memo`}
            maxLength={5000}
            onChange={(event) => setMemo(event.target.value)}
            value={memo}
          />
        </FormField>
      </fieldset>

      <footer className="mt-8 flex flex-col gap-3">
        {errorMessage ? (
          <p className={ERROR_BOX_CLASS_NAME} role="alert">
            {errorMessage}{' '}
            {existing && existing.code !== customer?.code ? (
              <Link
                className={`cursor-pointer rounded-sm font-semibold underline underline-offset-2 transition hover:text-[var(--foreground)] hover:decoration-2 ${FOCUS_CLASS_NAME}`}
                href={`${LIST_PATH}/${existing.code}`}
              >
                {existing.name} ({existing.code}) 보기
              </Link>
            ) : null}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Link className={SECONDARY_BUTTON_CLASS_NAME} href={cancelHref}>
            취소
          </Link>
          <button className={PRIMARY_BUTTON_CLASS_NAME} disabled={isSubmitting} type="submit">
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </footer>
    </form>
  );
}

/** 고객을 불러와 그려 준다. 상세·수정 화면이 함께 쓴다. */
export function KkiruCustomerLoader({
  code,
  children,
}: {
  code: string;
  children: (customer: KkiruCustomerDetail) => React.ReactNode;
}) {
  return (
    <KkiruLoader load={getKkiruCustomer} loadKey={code} noun="고객">
      {(customer) => children(customer)}
    </KkiruLoader>
  );
}
