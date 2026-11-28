'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { FormField } from '@/components/form-field';
import { ManwonInput } from '@/components/manwon-input';
import { AdminApiError } from '@/lib/admin-auth-api';
import { getSeoulToday } from '@/lib/choidolsang-inquiries-api';
import {
  type ContractDetail,
  type ContractFieldsInput,
  createContract,
  type MeetingDetail,
  updateContract,
} from '@/lib/kkiru-cases-api';
import { parseManwonText, toManwonText } from '@/lib/kkiru-format';
import { formatPhone, isValidMobilePhone } from '@/lib/phone';

const CONTROL_CLASS_NAME =
  'h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60';

type KkiruContractFormProps =
  | { mode: 'create'; meeting: MeetingDetail }
  | { mode: 'edit'; contract: ContractDetail };

type FormValues = {
  contractedOn: string;
  sameAsClient: boolean;
  landlordName: string;
  landlordPhone: string;
  depositText: string;
  rentText: string;
  premiumText: string;
  leaseStartOn: string;
  leaseEndOn: string;
  specialTerms: string;
  downPaymentText: string;
  commissionText: string;
  isMyListing: boolean | null;
  isMyClient: boolean | null;
};

type Target = {
  caseCode: string;
  customer: { name: string; phone: string };
  listing: { code: string; name: string; clientName: string; clientPhone: string };
};

function describeTarget(props: KkiruContractFormProps): Target {
  const source = props.mode === 'create' ? props.meeting : props.contract;
  return { caseCode: source.caseCode, customer: source.customer, listing: source.listing };
}

function toValues(props: KkiruContractFormProps): FormValues {
  if (props.mode === 'create') {
    const { listing } = props.meeting;
    return {
      commissionText: '',
      contractedOn: getSeoulToday(),
      depositText: toManwonText(String(listing.deposit)),
      downPaymentText: '',
      isMyClient: null,
      isMyListing: null,
      landlordName: '',
      landlordPhone: '',
      leaseEndOn: '',
      leaseStartOn: '',
      premiumText: toManwonText(String(listing.premium)),
      rentText: toManwonText(String(listing.rent)),
      sameAsClient: true,
      specialTerms: '',
    };
  }

  const { contract } = props;
  const sameAsClient =
    contract.landlordName === contract.listing.clientName &&
    contract.landlordPhone === contract.listing.clientPhone;

  return {
    commissionText: toManwonText(String(contract.commission)),
    contractedOn: contract.contractedOn,
    depositText: toManwonText(String(contract.deposit)),
    downPaymentText: toManwonText(String(contract.downPayment)),
    isMyClient: contract.isMyClient,
    isMyListing: contract.isMyListing,
    landlordName: contract.landlordName,
    landlordPhone: formatPhone(contract.landlordPhone),
    leaseEndOn: contract.leaseEndOn,
    leaseStartOn: contract.leaseStartOn,
    premiumText: toManwonText(String(contract.premium)),
    rentText: toManwonText(String(contract.rent)),
    sameAsClient,
    specialTerms: contract.specialTerms ?? '',
  };
}

function validate(values: FormValues): string | null {
  const checks: [boolean, string][] = [
    [Boolean(values.contractedOn), '계약 일자를 입력해 주세요.'],
    [values.sameAsClient || Boolean(values.landlordName.trim()), '임대인 이름을 입력해 주세요.'],
    [
      values.sameAsClient || isValidMobilePhone(values.landlordPhone),
      '임대인 연락처를 010-0000-0000 형식으로 입력해 주세요.',
    ],
    [
      [
        values.depositText,
        values.rentText,
        values.premiumText,
        values.downPaymentText,
        values.commissionText,
      ].every((text) => parseManwonText(text) !== null),
      '금액(보증금·임대료·권리금·계약금·수수료)을 모두 입력해 주세요. 없으면 0을 넣어 주세요.',
    ],
    [Boolean(values.leaseStartOn && values.leaseEndOn), '임대차 기간을 입력해 주세요.'],
    [values.leaseEndOn >= values.leaseStartOn, '임대차 종료일은 시작일보다 앞설 수 없습니다.'],
    [
      values.isMyListing !== null && values.isMyClient !== null,
      '내 매물 여부와 내 손님 여부를 골라 주세요.',
    ],
  ];

  return checks.find(([ok]) => !ok)?.[1] ?? null;
}

function toInput(values: FormValues): ContractFieldsInput {
  const amount = (text: string) => parseManwonText(text) as number;

  return {
    commission: amount(values.commissionText),
    contractedOn: values.contractedOn,
    deposit: amount(values.depositText),
    downPayment: amount(values.downPaymentText),
    isMyClient: values.isMyClient as boolean,
    isMyListing: values.isMyListing as boolean,
    landlordName: values.sameAsClient ? undefined : values.landlordName.trim(),
    landlordPhone: values.sameAsClient ? undefined : values.landlordPhone.replace(/\D/g, ''),
    landlordSameAsClient: values.sameAsClient,
    leaseEndOn: values.leaseEndOn,
    leaseStartOn: values.leaseStartOn,
    premium: amount(values.premiumText),
    rent: amount(values.rentText),
    specialTerms: values.specialTerms.trim() || null,
  };
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <fieldset className="flex gap-2">
      <legend className="sr-only">{label}</legend>
      {[
        { text: '예', value: true },
        { text: '아니오', value: false },
      ].map((option) => (
        <button
          aria-pressed={value === option.value}
          className={`h-10 border px-4 text-sm ${
            value === option.value
              ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
              : 'border-[var(--line)] hover:bg-[var(--background)]'
          }`}
          key={option.text}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.text}
        </button>
      ))}
    </fieldset>
  );
}

export function KkiruContractForm(props: KkiruContractFormProps) {
  const router = useRouter();
  const idPrefix = useId();
  const isEdit = props.mode === 'edit';
  const target = describeTarget(props);
  const [values, setValues] = useState(() => toValues(props));
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = (field: string) => `${idPrefix}-${field}`;

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validate(values);

    if (invalid) {
      setErrorMessage(invalid);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved =
        props.mode === 'edit'
          ? await updateContract(props.contract.id, toInput(values))
          : await createContract({ ...toInput(values), meetingId: props.meeting.id });
      router.push(`/kkiru/contracts/${saved.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof AdminApiError && error.status === 409
          ? '지금은 계약을 만들거나 고칠 수 없습니다. 미팅·계약 상태와, 이 매물에 다른 계약이 진행 중인지 확인해 주세요.'
          : '계약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
      setIsSubmitting(false);
    }
  }

  const cancelHref =
    props.mode === 'edit'
      ? `/kkiru/contracts/${props.contract.id}`
      : `/kkiru/meetings/${props.meeting.id}`;

  return (
    <form
      aria-label={isEdit ? '계약 수정' : '계약 진행'}
      className="border border-[var(--line)] bg-[var(--surface)] px-5 py-5"
      onSubmit={handleSubmit}
    >
      <p className="mb-6 bg-[var(--background)] px-4 py-3 text-sm">
        <span className="text-[var(--muted)]">케이스 </span>
        <span className="font-mono">{target.caseCode}</span>
        <span className="text-[var(--muted)]"> · 대상 매물 </span>
        {target.listing.name}
      </p>

      <fieldset className="flex flex-col gap-8" disabled={isSubmitting}>
        <legend className="sr-only">계약 정보</legend>

        <section className="flex flex-col gap-5">
          <h3 className="text-xs font-medium text-[var(--muted)]">당사자</h3>
          <FormField htmlFor={id('contracted-on')} label="계약 일자" required>
            <input
              className={`${CONTROL_CLASS_NAME} sm:w-48`}
              id={id('contracted-on')}
              onChange={(e) => update('contractedOn', e.target.value)}
              required
              type="date"
              value={values.contractedOn}
            />
          </FormField>
          <FormField label="임차인" required>
            <p className="flex h-10 items-center gap-3 text-sm">
              {target.customer.name}
              <span className="text-[var(--muted)] tabular-nums">
                {formatPhone(target.customer.phone)}
              </span>
            </p>
          </FormField>
          <FormField label="임대인" required>
            <div className="flex flex-col gap-2">
              <label className="flex h-10 cursor-pointer items-center gap-2 text-sm">
                <input
                  checked={values.sameAsClient}
                  className="size-4 accent-[var(--brand)]"
                  onChange={(e) => update('sameAsClient', e.target.checked)}
                  type="checkbox"
                />
                매물 의뢰인과 동일 ({target.listing.clientName},{' '}
                {formatPhone(target.listing.clientPhone)})
              </label>
              {values.sameAsClient ? null : (
                <div className="flex flex-wrap gap-2">
                  <input
                    aria-label="임대인 이름"
                    className={`${CONTROL_CLASS_NAME} sm:w-48`}
                    maxLength={100}
                    onChange={(e) => update('landlordName', e.target.value)}
                    placeholder="임대인 이름"
                    value={values.landlordName}
                  />
                  <input
                    aria-label="임대인 연락처"
                    className={`${CONTROL_CLASS_NAME} tabular-nums sm:w-48`}
                    inputMode="tel"
                    onChange={(e) => update('landlordPhone', formatPhone(e.target.value))}
                    placeholder="010-1234-5678"
                    type="tel"
                    value={values.landlordPhone}
                  />
                </div>
              )}
            </div>
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-xs font-medium text-[var(--muted)]">계약 조건 (실제 금액)</h3>
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
          <FormField htmlFor={id('lease-start')} label="임대차 기간" required>
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="임대차 시작일"
                className={`${CONTROL_CLASS_NAME} sm:w-44`}
                id={id('lease-start')}
                onChange={(e) => update('leaseStartOn', e.target.value)}
                required
                type="date"
                value={values.leaseStartOn}
              />
              <span className="text-[var(--muted)]">~</span>
              <input
                aria-label="임대차 종료일"
                className={`${CONTROL_CLASS_NAME} sm:w-44`}
                onChange={(e) => update('leaseEndOn', e.target.value)}
                required
                type="date"
                value={values.leaseEndOn}
              />
            </div>
          </FormField>
          <FormField htmlFor={id('terms')} label="특약 사항">
            <textarea
              className={`${CONTROL_CLASS_NAME} h-auto min-h-28 resize-y py-2.5 leading-relaxed`}
              id={id('terms')}
              maxLength={5000}
              onChange={(e) => update('specialTerms', e.target.value)}
              value={values.specialTerms}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-xs font-medium text-[var(--muted)]">계약금·수수료</h3>
          <FormField htmlFor={id('down')} label="계약금" required>
            <ManwonInput
              id={id('down')}
              onChange={(text) => update('downPaymentText', text)}
              required
              value={values.downPaymentText}
            />
          </FormField>
          <FormField htmlFor={id('commission')} label="수수료" required>
            <ManwonInput
              id={id('commission')}
              onChange={(text) => update('commissionText', text)}
              required
              value={values.commissionText}
            />
          </FormField>
          <FormField label="내 매물 여부" required>
            <YesNo
              label="내 매물 여부"
              onChange={(value) => update('isMyListing', value)}
              value={values.isMyListing}
            />
          </FormField>
          <FormField label="내 손님 여부" required>
            <YesNo
              label="내 손님 여부"
              onChange={(value) => update('isMyClient', value)}
              value={values.isMyClient}
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
            href={cancelHref}
          >
            취소
          </Link>
          <button
            className="h-10 bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '저장 중...' : isEdit ? '저장' : '계약 만들기'}
          </button>
        </div>
      </footer>
    </form>
  );
}
