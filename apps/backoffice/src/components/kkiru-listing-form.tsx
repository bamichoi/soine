'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { FormField } from '@/components/form-field';
import { ManwonInput } from '@/components/manwon-input';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  formatDecimal,
  parseDecimalText,
  parseManwonText,
  squareMetersToPyeong,
  toDecimalText,
  toManwonText,
} from '@/lib/kkiru-format';
import {
  createKkiruListing,
  getKkiruListing,
  type KkiruListing,
  type KkiruListingInput,
  updateKkiruListing,
} from '@/lib/kkiru-listings-api';
import { formatPhone, isValidMobilePhone } from '@/lib/phone';

const LIST_PATH = '/kkiru/listings';

const CONTROL_CLASS_NAME =
  'h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60';

type FormValues = {
  name: string;
  address: string;
  areaText: string;
  floor: string;
  rentText: string;
  depositText: string;
  premiumText: string;
  parking: '' | 'yes' | 'no';
  restroomText: string;
  features: string;
  clientName: string;
  clientPhone: string;
};

const EMPTY_VALUES: FormValues = {
  address: '',
  areaText: '',
  clientName: '',
  clientPhone: '',
  depositText: '',
  features: '',
  floor: '',
  name: '',
  parking: '',
  premiumText: '',
  rentText: '',
  restroomText: '',
};

function toParking(hasParking: boolean | null): FormValues['parking'] {
  if (hasParking === null) {
    return '';
  }

  return hasParking ? 'yes' : 'no';
}

function toValues(listing?: KkiruListing): FormValues {
  if (!listing) {
    return EMPTY_VALUES;
  }

  return {
    address: listing.address,
    areaText: String(listing.areaM2),
    clientName: listing.clientName,
    clientPhone: formatPhone(listing.clientPhone),
    depositText: toManwonText(String(listing.deposit)),
    features: listing.features ?? '',
    floor: listing.floor,
    name: listing.name,
    parking: toParking(listing.hasParking),
    premiumText: toManwonText(String(listing.premium)),
    rentText: toManwonText(String(listing.rent)),
    restroomText: listing.restroomCount === null ? '' : String(listing.restroomCount),
  };
}

function validateRequired(values: FormValues): string | null {
  const required: [string, string][] = [
    [values.name, '매물 이름'],
    [values.address, '주소'],
    [values.floor, '층수'],
    [values.clientName, '의뢰인 이름'],
  ];
  const missing = required.find(([value]) => !value.trim());

  if (missing) {
    return `${missing[1]}을(를) 입력해 주세요.`;
  }

  if (!parseDecimalText(values.areaText)) {
    return '면적(㎡)을 입력해 주세요.';
  }

  if (
    [values.rentText, values.depositText, values.premiumText].some(
      (text) => parseManwonText(text) === null,
    )
  ) {
    return '임대료·보증금·권리금을 입력해 주세요. 없으면 0을 넣어 주세요.';
  }

  return isValidMobilePhone(values.clientPhone)
    ? null
    : '의뢰인 연락처를 010-0000-0000 형식으로 입력해 주세요.';
}

function buildInput(values: FormValues): KkiruListingInput | string {
  const invalid = validateRequired(values);

  if (invalid) {
    return invalid;
  }

  return {
    address: values.address.trim(),
    areaM2: parseDecimalText(values.areaText) as number,
    clientName: values.clientName.trim(),
    clientPhone: values.clientPhone.replace(/\D/g, ''),
    deposit: parseManwonText(values.depositText) as number,
    features: values.features.trim() || null,
    floor: values.floor.trim(),
    hasParking: values.parking === '' ? null : values.parking === 'yes',
    name: values.name.trim(),
    premium: parseManwonText(values.premiumText) as number,
    rent: parseManwonText(values.rentText) as number,
    restroomCount: values.restroomText ? Number(values.restroomText) : null,
  };
}

export function KkiruListingForm({ listing }: { listing?: KkiruListing }) {
  const router = useRouter();
  const idPrefix = useId();
  const [values, setValues] = useState(() => toValues(listing));
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = (field: string) => `${idPrefix}-${field}`;
  const area = parseDecimalText(values.areaText);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildInput(values);

    if (typeof result === 'string') {
      setErrorMessage(result);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved = listing
        ? await updateKkiruListing(listing.code, result)
        : await createKkiruListing(result);
      router.push(`${LIST_PATH}/${saved.code}`);
    } catch (error) {
      setErrorMessage(
        error instanceof AdminApiError && error.status === 400
          ? '입력한 내용을 다시 확인해 주세요.'
          : '매물을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-label={listing ? '매물 수정' : '새 매물'}
      className="border border-[var(--line)] bg-[var(--surface)] px-5 py-5"
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-8" disabled={isSubmitting}>
        <legend className="sr-only">매물 정보</legend>

        <section className="flex flex-col gap-5">
          <h3 className="text-xs font-medium text-[var(--muted)]">매물</h3>
          <FormField htmlFor={id('name')} label="매물 이름" required>
            <input
              className={CONTROL_CLASS_NAME}
              id={id('name')}
              maxLength={100}
              onChange={(e) => update('name', e.target.value)}
              required
              value={values.name}
            />
          </FormField>
          <FormField htmlFor={id('address')} label="주소" required>
            <input
              className={CONTROL_CLASS_NAME}
              id={id('address')}
              maxLength={300}
              onChange={(e) => update('address', e.target.value)}
              required
              value={values.address}
            />
          </FormField>
          <FormField htmlFor={id('area')} label="면적" required>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative sm:w-48">
                <input
                  className={`${CONTROL_CLASS_NAME} pr-9 text-right tabular-nums`}
                  id={id('area')}
                  inputMode="decimal"
                  onChange={(e) => update('areaText', toDecimalText(e.target.value))}
                  placeholder="0"
                  required
                  value={values.areaText}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--muted)]">
                  ㎡
                </span>
              </div>
              <span className="text-sm text-[var(--muted)] tabular-nums">
                {area
                  ? `약 ${formatDecimal(squareMetersToPyeong(area))}평`
                  : '평으로 환산해 보여 줍니다'}
              </span>
            </div>
          </FormField>
          <FormField htmlFor={id('floor')} label="층수" required>
            <input
              className={`${CONTROL_CLASS_NAME} sm:w-48`}
              id={id('floor')}
              maxLength={50}
              onChange={(e) => update('floor', e.target.value)}
              placeholder="예: 1층, 지하1층"
              required
              value={values.floor}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-xs font-medium text-[var(--muted)]">금액</h3>
          <FormField htmlFor={id('deposit')} label="보증금" required>
            <ManwonInput
              id={id('deposit')}
              onChange={(text) => update('depositText', text)}
              required
              value={values.depositText}
            />
          </FormField>
          <FormField htmlFor={id('rent')} label="임대료" required>
            <ManwonInput
              id={id('rent')}
              onChange={(text) => update('rentText', text)}
              required
              value={values.rentText}
            />
          </FormField>
          <FormField htmlFor={id('premium')} label="권리금" required>
            <ManwonInput
              id={id('premium')}
              onChange={(text) => update('premiumText', text)}
              required
              value={values.premiumText}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-xs font-medium text-[var(--muted)]">시설</h3>
          <FormField htmlFor={id('parking')} label="주차">
            <select
              className={`${CONTROL_CLASS_NAME} sm:w-48`}
              id={id('parking')}
              onChange={(e) => update('parking', e.target.value as FormValues['parking'])}
              value={values.parking}
            >
              <option value="">선택 안 함</option>
              <option value="yes">가능</option>
              <option value="no">불가</option>
            </select>
          </FormField>
          <FormField htmlFor={id('restroom')} label="화장실 개수">
            <input
              className={`${CONTROL_CLASS_NAME} text-right tabular-nums sm:w-32`}
              id={id('restroom')}
              inputMode="numeric"
              onChange={(e) =>
                update('restroomText', e.target.value.replace(/\D/g, '').slice(0, 2))
              }
              value={values.restroomText}
            />
          </FormField>
          <FormField htmlFor={id('features')} label="특징">
            <textarea
              className={`${CONTROL_CLASS_NAME} h-auto min-h-28 resize-y py-2.5 leading-relaxed`}
              id={id('features')}
              maxLength={5000}
              onChange={(e) => update('features', e.target.value)}
              value={values.features}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-xs font-medium text-[var(--muted)]">의뢰인</h3>
          <FormField htmlFor={id('client-name')} label="의뢰인 이름" required>
            <input
              className={`${CONTROL_CLASS_NAME} sm:w-64`}
              id={id('client-name')}
              maxLength={100}
              onChange={(e) => update('clientName', e.target.value)}
              required
              value={values.clientName}
            />
          </FormField>
          <FormField htmlFor={id('client-phone')} label="의뢰인 연락처" required>
            <input
              autoComplete="off"
              className={`${CONTROL_CLASS_NAME} tabular-nums sm:w-64`}
              id={id('client-phone')}
              inputMode="tel"
              onChange={(e) => update('clientPhone', formatPhone(e.target.value))}
              placeholder="010-1234-5678"
              required
              type="tel"
              value={values.clientPhone}
            />
          </FormField>
        </section>
      </fieldset>

      <footer className="mt-8 flex flex-col gap-3">
        {errorMessage ? (
          <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Link
            className="flex h-10 items-center border border-[var(--line)] px-4 text-sm font-medium hover:bg-[var(--background)]"
            href={listing ? `${LIST_PATH}/${listing.code}` : LIST_PATH}
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
  | { kind: 'loaded'; listing: KkiruListing };

/** 매물을 불러와 그려 준다. 상세·수정 화면이 함께 쓴다. */
export function KkiruListingLoader({
  code,
  children,
}: {
  code: string;
  children: (listing: KkiruListing) => React.ReactNode;
}) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    getKkiruListing(code)
      .then((listing) => {
        if (isActive) {
          setState({ kind: 'loaded', listing });
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
    return <p className="py-10 text-sm text-[var(--muted)]">매물을 불러오고 있습니다.</p>;
  }

  if (state.kind === 'not-found') {
    return <p className="py-10 text-sm text-[var(--muted)]">해당 매물을 찾을 수 없습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="py-10 text-sm text-[var(--error)]" role="alert">
        매물을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return <>{children(state.listing)}</>;
}
