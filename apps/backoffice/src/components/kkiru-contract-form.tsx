'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useId, useState } from 'react';
import { FormField } from '@/components/form-field';
import { KkiruListingPicker } from '@/components/kkiru-listing-picker';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
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
import { formatManwon, parseManwonText, toManwonText } from '@/lib/kkiru-format';
import {
  getKkiruListing,
  type KkiruListing,
  type KkiruListingOption,
} from '@/lib/kkiru-listings-api';
import { type KkiruListingStatus, LISTING_STATUS_LABELS } from '@/lib/kkiru-status';
import {
  chipClassName,
  ERROR_BOX_CLASS_NAME,
  FORM_SECTION_TITLE_CLASS_NAME,
  HERO_CLASS_NAME,
  INPUT_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
  TEXT_BUTTON_CLASS_NAME,
} from '@/lib/kkiru-ui';
import { formatPhone, isValidMobilePhone } from '@/lib/phone';

type KkiruContractFormProps =
  | { mode: 'create'; meeting: MeetingDetail; initialListingCode?: string | null }
  | { mode: 'edit'; contract: ContractDetail };

/** 이 상태의 매물로는 새 계약을 만들 수 없다. */
const BLOCKED_LISTING_STATUSES: KkiruListingStatus[] = ['contracting', 'contracted'];

/** 계약 대상 매물. 임대인 기준값(의뢰인)과 금액 기본값을 여기서 가져온다. */
type TargetListing = Pick<
  KkiruListing,
  'id' | 'code' | 'name' | 'deposit' | 'rent' | 'premium' | 'status' | 'clientName' | 'clientPhone'
>;

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
  balanceText: string;
  /** 사용자가 잔금을 직접 고쳤으면 true. 그 뒤로는 보증금·계약금이 바뀌어도 잔금을 덮어쓰지 않는다. */
  balanceEdited: boolean;
  balanceDueOn: string;
  commissionText: string;
  isMyListing: boolean | null;
  isMyClient: boolean | null;
};

type Target = {
  caseCode: string;
  title: string;
  customer: { name: string; phone: string };
};

function describeTarget(props: KkiruContractFormProps): Target {
  return props.mode === 'create'
    ? { caseCode: props.meeting.code, customer: props.meeting.customer, title: props.meeting.title }
    : {
        caseCode: props.contract.caseCode,
        customer: props.contract.customer,
        title: props.contract.meeting.title,
      };
}

/** 잔금 기본값: 보증금 − 계약금 (음수면 0). 둘 중 하나라도 비어 있으면 비운다. */
function toDefaultBalanceText(depositText: string, downPaymentText: string): string {
  const deposit = parseManwonText(depositText);
  const downPayment = parseManwonText(downPaymentText);

  if (deposit === null || downPayment === null) {
    return '';
  }

  return toManwonText(String(Math.max(deposit - downPayment, 0)));
}

/** 잔금을 아직 고치지 않았으면 자동으로 채운다는 안내를 보여 준다. */
function balanceHint(values: FormValues): string | undefined {
  return values.balanceEdited
    ? undefined
    : '보증금 − 계약금으로 채웁니다. 직접 고치면 그 값을 그대로 씁니다.';
}

/** 잔금을 직접 고치기 전까지만 보증금·계약금에 맞춰 잔금을 다시 채운다. */
function withAutoBalance(values: FormValues): FormValues {
  return values.balanceEdited
    ? values
    : { ...values, balanceText: toDefaultBalanceText(values.depositText, values.downPaymentText) };
}

/** 매물을 고르면 금액 기본값과 임대인(의뢰인과 동일)을 그 매물 기준으로 다시 채운다. */
function withListingDefaults(values: FormValues, listing: TargetListing | null): FormValues {
  return withAutoBalance({
    ...values,
    depositText: listing ? toManwonText(String(listing.deposit)) : '',
    landlordName: '',
    landlordPhone: '',
    premiumText: listing ? toManwonText(String(listing.premium)) : '',
    rentText: listing ? toManwonText(String(listing.rent)) : '',
    sameAsClient: true,
  });
}

function toValues(props: KkiruContractFormProps): FormValues {
  if (props.mode === 'create') {
    return withListingDefaults(
      {
        balanceDueOn: '',
        balanceEdited: false,
        balanceText: '',
        commissionText: '',
        contractedOn: getSeoulToday(),
        depositText: '',
        downPaymentText: '',
        isMyClient: null,
        isMyListing: null,
        landlordName: '',
        landlordPhone: '',
        leaseEndOn: '',
        leaseStartOn: '',
        premiumText: '',
        rentText: '',
        sameAsClient: true,
        specialTerms: '',
      },
      null,
    );
  }

  const { contract } = props;
  const sameAsClient =
    contract.landlordName === contract.listing.clientName &&
    contract.landlordPhone === contract.listing.clientPhone;

  // 수정 모드는 저장된 잔금을 그대로 보여 주고, 보증금·계약금을 바꿔도 덮어쓰지 않는다.
  return {
    balanceDueOn: contract.balanceDueOn,
    balanceEdited: true,
    balanceText: toManwonText(String(contract.balance)),
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
        values.balanceText,
        values.commissionText,
      ].every((text) => parseManwonText(text) !== null),
      '금액(보증금·임대료·권리금·계약금·잔금·수수료)을 모두 입력해 주세요. 없으면 0을 넣어 주세요.',
    ],
    [Boolean(values.balanceDueOn), '잔금일을 입력해 주세요.'],
    [values.balanceDueOn >= values.contractedOn, '잔금일은 계약 일자와 같거나 뒤여야 합니다.'],
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
    balance: amount(values.balanceText),
    balanceDueOn: values.balanceDueOn,
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

function saveContract(
  props: KkiruContractFormProps,
  input: ContractFieldsInput,
  listingId: string,
): Promise<ContractDetail> {
  return props.mode === 'edit'
    ? updateContract(props.contract.id, input)
    : createContract({ ...input, listingId, meetingCode: props.meeting.code });
}

function submitErrorText(error: unknown, isEdit: boolean): string {
  if (!(error instanceof AdminApiError && error.status === 409)) {
    return '계약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  return isEdit
    ? '지금은 계약을 고칠 수 없습니다. 계약 상태를 확인해 주세요.'
    : '이미 계약 중이거나 계약완료된 매물입니다. 또는 지금 계약을 만들 수 없는 미팅입니다.';
}

/** 계약 대상 매물. 새 계약이면 미팅 매물을 먼저 후보로 보여 주고 검색으로도 고른다. */
function TargetListingField({
  listing,
  isLoading,
  error,
  suggestions,
  onPick,
  onClear,
}: {
  listing: TargetListing | null;
  isLoading: boolean;
  error: string;
  suggestions: KkiruListingOption[];
  onPick: (code: string) => void;
  /** 없으면 매물을 바꿀 수 없다 (계약 수정) */
  onClear?: () => void;
}) {
  let body: ReactNode;

  if (listing) {
    body = (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[var(--brand-soft)] px-3.5 py-3 text-[15px]">
        <span className="font-mono text-xs font-medium text-[var(--muted)]" translate="no">
          {listing.code}
        </span>
        <span className="font-bold">{listing.name}</span>
        <span className="text-[13px] text-[var(--muted)] tabular-nums">
          보증금 {formatManwon(listing.deposit)} / 월 {formatManwon(listing.rent)} · 권리금{' '}
          {formatManwon(listing.premium)}
        </span>
        {onClear ? (
          <button className={`ml-auto ${TEXT_BUTTON_CLASS_NAME}`} onClick={onClear} type="button">
            다른 매물
          </button>
        ) : null}
      </div>
    );
  } else if (isLoading) {
    body = <p className="text-sm text-[var(--muted)]">매물을 불러오고 있습니다.</p>;
  } else {
    body = (
      <KkiruListingPicker
        disabledStatuses={BLOCKED_LISTING_STATUSES}
        onPick={(picked) => onPick(picked.code)}
        suggestions={suggestions}
      />
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <FormField look="kkiru" label="대상 매물" required>
        <div className="flex flex-col gap-2">
          {body}
          {error ? (
            <p className="text-xs text-[var(--error)]" role="alert">
              {error}
            </p>
          ) : null}
          {listing && onClear && listing.status !== 'available' ? (
            <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
              지금 매물 상태
              <KkiruStatusBadge
                label={LISTING_STATUS_LABELS[listing.status]}
                status={listing.status}
              />
            </p>
          ) : null}
        </div>
      </FormField>
    </section>
  );
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
          className={chipClassName(value === option.value, 'card')}
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
  const initialListingCode = props.mode === 'create' ? (props.initialListingCode ?? null) : null;
  const [listing, setListing] = useState<TargetListing | null>(
    props.mode === 'edit' ? props.contract.listing : null,
  );
  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [listingError, setListingError] = useState('');
  const [values, setValues] = useState(() => toValues(props));
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = (field: string) => `${idPrefix}-${field}`;

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /** 보증금·계약금을 바꾸면 잔금을 직접 고치기 전까지 잔금 기본값도 바꾼다. */
  function updateAmountForBalance(field: 'depositText' | 'downPaymentText', text: string) {
    setValues((current) => withAutoBalance({ ...current, [field]: text }));
  }

  // 매물을 고르면 의뢰인 정보가 있는 전체 매물을 불러와 기본값을 채운다.
  async function pickListing(code: string) {
    setListingError('');
    setIsLoadingListing(true);

    try {
      const picked = await getKkiruListing(code);

      if (BLOCKED_LISTING_STATUSES.includes(picked.status)) {
        setListingError(
          `${picked.name}은(는) ${LISTING_STATUS_LABELS[picked.status]} 매물이라 고를 수 없습니다.`,
        );
        return;
      }

      setListing(picked);
      setValues((current) => withListingDefaults(current, picked));
    } catch {
      setListingError('매물을 불러오지 못했습니다. 다시 골라 주세요.');
    } finally {
      setIsLoadingListing(false);
    }
  }

  // 주소로 넘어온 매물(미팅 매물 줄의 계약 진행)은 미리 고른다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 처음 한 번만 미리 고른다.
  useEffect(() => {
    if (initialListingCode) {
      void pickListing(initialListingCode);
    }
  }, [initialListingCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listing) {
      setErrorMessage('대상 매물을 골라 주세요.');
      return;
    }

    const invalid = validate(values);

    if (invalid) {
      setErrorMessage(invalid);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved = await saveContract(props, toInput(values), listing.id);
      router.push(`/kkiru/contracts/${saved.id}`);
    } catch (error) {
      setErrorMessage(submitErrorText(error, isEdit));
      setIsSubmitting(false);
    }
  }

  const cancelHref =
    props.mode === 'edit'
      ? `/kkiru/contracts/${props.contract.id}`
      : `/kkiru/meetings/${props.meeting.code}`;

  return (
    <form
      aria-label={isEdit ? '계약 수정' : '계약 진행'}
      className={HERO_CLASS_NAME}
      onSubmit={handleSubmit}
    >
      <p className="mb-8 rounded-xl bg-[var(--background)] px-4 py-3 text-sm font-semibold">
        <span className="font-normal text-[var(--muted)]">케이스 </span>
        <span className="font-mono" translate="no">
          {target.caseCode}
        </span>
        <span className="text-[var(--muted)]"> · </span>
        {target.title}
        <span className="text-[var(--muted)]"> · </span>
        {target.customer.name}
      </p>

      <fieldset className="flex flex-col gap-8" disabled={isSubmitting}>
        <legend className="sr-only">계약 정보</legend>

        <TargetListingField
          error={listingError}
          isLoading={isLoadingListing}
          listing={listing}
          onClear={
            isEdit
              ? undefined
              : () => {
                  setListing(null);
                  setValues((current) => withListingDefaults(current, null));
                }
          }
          onPick={(code) => void pickListing(code)}
          suggestions={props.mode === 'create' ? props.meeting.listings : []}
        />

        <section className="flex flex-col gap-5">
          <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>당사자</h3>
          <FormField look="kkiru" htmlFor={id('contracted-on')} label="계약 일자" required>
            <input
              className={`${INPUT_CLASS_NAME} sm:w-48`}
              id={id('contracted-on')}
              onChange={(e) => update('contractedOn', e.target.value)}
              required
              type="date"
              value={values.contractedOn}
            />
          </FormField>
          <FormField look="kkiru" label="임차인" required>
            <p className="flex h-11 items-center gap-3 text-[15px] font-semibold">
              {target.customer.name}
              <span className="text-[var(--muted)] tabular-nums">
                {formatPhone(target.customer.phone)}
              </span>
            </p>
          </FormField>
          <FormField look="kkiru" label="임대인" required>
            <div className="flex flex-col gap-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px]">
                <input
                  checked={values.sameAsClient}
                  className="size-4 accent-[var(--brand)]"
                  onChange={(e) => update('sameAsClient', e.target.checked)}
                  type="checkbox"
                />
                매물 의뢰인과 동일
                {listing ? ` (${listing.clientName}, ${formatPhone(listing.clientPhone)})` : null}
              </label>
              {values.sameAsClient ? null : (
                <div className="flex flex-wrap gap-2">
                  <input
                    aria-label="임대인 이름"
                    className={`${INPUT_CLASS_NAME} sm:w-48`}
                    maxLength={100}
                    onChange={(e) => update('landlordName', e.target.value)}
                    placeholder="임대인 이름"
                    value={values.landlordName}
                  />
                  <input
                    aria-label="임대인 연락처"
                    className={`${INPUT_CLASS_NAME} tabular-nums sm:w-48`}
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
          <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>계약 조건 (실제 금액)</h3>
          <FormField look="kkiru" htmlFor={id('deposit')} label="보증금" required>
            <ManwonInput
              id={id('deposit')}
              onChange={(text) => updateAmountForBalance('depositText', text)}
              required
              value={values.depositText}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('rent')} label="임대료" required>
            <ManwonInput
              id={id('rent')}
              onChange={(text) => update('rentText', text)}
              required
              value={values.rentText}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('premium')} label="권리금" required>
            <ManwonInput
              id={id('premium')}
              onChange={(text) => update('premiumText', text)}
              required
              value={values.premiumText}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('lease-start')} label="임대차 기간" required>
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="임대차 시작일"
                className={`${INPUT_CLASS_NAME} sm:w-44`}
                id={id('lease-start')}
                onChange={(e) => update('leaseStartOn', e.target.value)}
                required
                type="date"
                value={values.leaseStartOn}
              />
              <span className="text-[var(--muted)]">~</span>
              <input
                aria-label="임대차 종료일"
                className={`${INPUT_CLASS_NAME} sm:w-44`}
                onChange={(e) => update('leaseEndOn', e.target.value)}
                required
                type="date"
                value={values.leaseEndOn}
              />
            </div>
          </FormField>
          <FormField look="kkiru" htmlFor={id('terms')} label="특약 사항">
            <textarea
              className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-28 resize-y py-2.5 leading-relaxed`}
              id={id('terms')}
              maxLength={5000}
              onChange={(e) => update('specialTerms', e.target.value)}
              value={values.specialTerms}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>계약금·수수료</h3>
          <FormField look="kkiru" htmlFor={id('down')} label="계약금" required>
            <ManwonInput
              id={id('down')}
              onChange={(text) => updateAmountForBalance('downPaymentText', text)}
              required
              value={values.downPaymentText}
            />
          </FormField>
          <FormField
            look="kkiru"
            hint={balanceHint(values)}
            htmlFor={id('balance')}
            label="잔금"
            required
          >
            <ManwonInput
              id={id('balance')}
              onChange={(text) =>
                setValues((current) => ({ ...current, balanceEdited: true, balanceText: text }))
              }
              required
              value={values.balanceText}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('balance-due')} label="잔금일" required>
            <input
              className={`${INPUT_CLASS_NAME} sm:w-48`}
              id={id('balance-due')}
              min={values.contractedOn || undefined}
              onChange={(e) => update('balanceDueOn', e.target.value)}
              required
              type="date"
              value={values.balanceDueOn}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('commission')} label="수수료" required>
            <ManwonInput
              id={id('commission')}
              onChange={(text) => update('commissionText', text)}
              required
              value={values.commissionText}
            />
          </FormField>
          <FormField look="kkiru" label="내 매물 여부" required>
            <YesNo
              label="내 매물 여부"
              onChange={(value) => update('isMyListing', value)}
              value={values.isMyListing}
            />
          </FormField>
          <FormField look="kkiru" label="내 손님 여부" required>
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
          <p className={ERROR_BOX_CLASS_NAME} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Link className={SECONDARY_BUTTON_CLASS_NAME} href={cancelHref}>
            취소
          </Link>
          <button
            className={PRIMARY_BUTTON_CLASS_NAME}
            disabled={isSubmitting || isLoadingListing}
            type="submit"
          >
            {isSubmitting ? '저장 중...' : isEdit ? '저장' : '계약 만들기'}
          </button>
        </div>
      </footer>
    </form>
  );
}
