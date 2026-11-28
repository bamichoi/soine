'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { FormField } from '@/components/form-field';
import { KkiruCustomerPicker, type PickedCustomer } from '@/components/kkiru-customer-picker';
import { ManwonInput } from '@/components/manwon-input';
import { AdminApiError } from '@/lib/admin-auth-api';
import { getSeoulToday, toSeoulDateAndTime } from '@/lib/choidolsang-inquiries-api';
import {
  createMeeting,
  INFLOW_SOURCE_LABELS,
  type InflowSource,
  type MeetingDetail,
  type MeetingFieldsInput,
  updateMeeting,
} from '@/lib/kkiru-cases-api';
import {
  formatDecimal,
  formatManwon,
  parseDecimalText,
  parseManwonText,
  pyeongToSquareMeters,
  toDecimalText,
  toManwonText,
} from '@/lib/kkiru-format';
import {
  chipClassName,
  ERROR_BOX_CLASS_NAME,
  FORM_SECTION_TITLE_CLASS_NAME,
  HERO_CLASS_NAME,
  INPUT_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  INPUT_UNIT_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/kkiru-ui';

const INFLOW_SOURCES: InflowSource[] = ['naver_land', 'instagram', 'other'];

type FormValues = {
  customer: PickedCustomer | null;
  title: string;
  interestArea: string;
  desiredBusiness: string;
  pyeongMinText: string;
  pyeongMaxText: string;
  desiredFloor: string;
  rentText: string;
  depositText: string;
  premiumText: string;
  inflowSource: InflowSource | null;
  inflowSourceDetail: string;
  meetDate: string;
  meetTime: string;
  content: string;
};

function toValues(meeting?: MeetingDetail): FormValues {
  if (!meeting) {
    return {
      content: '',
      customer: null,
      depositText: '',
      desiredBusiness: '',
      desiredFloor: '',
      inflowSource: null,
      inflowSourceDetail: '',
      interestArea: '',
      meetDate: getSeoulToday(),
      meetTime: '',
      premiumText: '',
      pyeongMaxText: '',
      pyeongMinText: '',
      rentText: '',
      title: '',
    };
  }

  const meetAt = toSeoulDateAndTime(meeting.meetAt);

  return {
    content: '',
    customer: meeting.customer,
    depositText: toManwonText(String(meeting.maxDeposit)),
    desiredBusiness: meeting.desiredBusiness,
    desiredFloor: meeting.desiredFloor,
    inflowSource: meeting.inflowSource,
    inflowSourceDetail: meeting.inflowSourceDetail ?? '',
    interestArea: meeting.interestArea,
    meetDate: meetAt.date,
    meetTime: meetAt.time,
    premiumText: toManwonText(String(meeting.maxPremium)),
    pyeongMaxText: String(meeting.desiredPyeongMax),
    pyeongMinText: String(meeting.desiredPyeongMin),
    rentText: toManwonText(String(meeting.desiredRent)),
    title: meeting.title,
  };
}

function firstMissing(values: FormValues, isEdit: boolean): string | null {
  const required: [boolean, string][] = [
    [values.customer !== null, '고객 찾기나 고객 추가로 고객을 골라 주세요.'],
    [Boolean(values.title.trim()), '제목을 입력해 주세요.'],
    [Boolean(values.meetDate && values.meetTime), '미팅 날짜와 시간을 입력해 주세요.'],
    [Boolean(values.interestArea.trim()), '관심 상권을 입력해 주세요.'],
    [Boolean(values.desiredBusiness.trim()), '희망 업종을 입력해 주세요.'],
    [Boolean(values.desiredFloor.trim()), '희망 층수를 입력해 주세요.'],
    [Boolean(values.inflowSource), '유입 경로를 골라 주세요.'],
    [
      values.inflowSource !== 'other' || Boolean(values.inflowSourceDetail.trim()),
      '기타 유입 경로를 적어 주세요.',
    ],
    [isEdit || Boolean(values.content.trim()), '미팅 내용을 입력해 주세요.'],
  ];

  return required.find(([ok]) => !ok)?.[1] ?? null;
}

function buildFields(values: FormValues, isEdit: boolean): MeetingFieldsInput | string {
  const missing = firstMissing(values, isEdit);

  if (missing) {
    return missing;
  }

  const min = parseDecimalText(values.pyeongMinText);
  const max = parseDecimalText(values.pyeongMaxText);

  if (!(min && max)) {
    return '희망 평수 범위를 입력해 주세요.';
  }

  if (min > max) {
    return '희망 평수는 작은 값부터 큰 값 순서로 입력해 주세요.';
  }

  const amounts = [values.rentText, values.depositText, values.premiumText].map(parseManwonText);

  if (amounts.some((amount) => amount === null)) {
    return '희망 임대료·최대 보증금·최대 권리금을 입력해 주세요. 없으면 0을 넣어 주세요.';
  }

  const [desiredRent, maxDeposit, maxPremium] = amounts as number[];

  return {
    desiredBusiness: values.desiredBusiness.trim(),
    desiredFloor: values.desiredFloor.trim(),
    desiredPyeongMax: max,
    desiredPyeongMin: min,
    desiredRent,
    inflowSource: values.inflowSource as InflowSource,
    inflowSourceDetail: values.inflowSource === 'other' ? values.inflowSourceDetail.trim() : null,
    interestArea: values.interestArea.trim(),
    maxDeposit,
    maxPremium,
    meetAt: `${values.meetDate}T${values.meetTime}:00+09:00`,
    title: values.title.trim(),
  };
}

function submitErrorText(error: unknown): string {
  return error instanceof AdminApiError && error.status === 400
    ? '입력한 내용을 다시 확인해 주세요.'
    : '미팅을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function PyeongRange({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: FormValues;
  onChange: (field: 'pyeongMinText' | 'pyeongMaxText', text: string) => void;
}) {
  const min = parseDecimalText(values.pyeongMinText);
  const max = parseDecimalText(values.pyeongMaxText);
  const input = (field: 'pyeongMinText' | 'pyeongMaxText', label: string) => (
    <div className="relative w-28">
      <input
        aria-label={label}
        className={`${INPUT_CLASS_NAME} pr-9 text-right tabular-nums`}
        id={field === 'pyeongMinText' ? `${idPrefix}-pyeong` : undefined}
        inputMode="decimal"
        onChange={(event) => onChange(field, toDecimalText(event.target.value))}
        required
        value={values[field]}
      />
      <span className={INPUT_UNIT_CLASS_NAME}>평</span>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {input('pyeongMinText', '희망 평수 최소')}
      <span className="text-[var(--muted)]">~</span>
      {input('pyeongMaxText', '희망 평수 최대')}
      <span className="text-sm text-[var(--muted)] tabular-nums">
        {min && max
          ? `약 ${formatDecimal(pyeongToSquareMeters(min))}~${formatDecimal(pyeongToSquareMeters(max))}㎡`
          : '㎡로 환산해 보여 줍니다'}
      </span>
    </div>
  );
}

export function KkiruMeetingForm({
  meeting,
  initialCustomerCode,
}: {
  meeting?: MeetingDetail;
  initialCustomerCode?: string | null;
}) {
  const router = useRouter();
  const idPrefix = useId();
  const isEdit = meeting !== undefined;
  const [values, setValues] = useState(() => toValues(meeting));
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = (field: string) => `${idPrefix}-${field}`;
  const budget =
    (parseManwonText(values.depositText) ?? 0) + (parseManwonText(values.premiumText) ?? 0);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = buildFields(values, isEdit);

    if (typeof fields === 'string') {
      setErrorMessage(fields);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved = isEdit
        ? await updateMeeting(meeting.code, fields)
        : await createMeeting({
            ...fields,
            content: values.content.trim(),
            customerCode: (values.customer as PickedCustomer).code,
          });
      router.push(`/kkiru/meetings/${saved.code}`);
    } catch (error) {
      setErrorMessage(submitErrorText(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-label={isEdit ? '미팅 수정' : '새 미팅'}
      className={HERO_CLASS_NAME}
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-8" disabled={isSubmitting}>
        <legend className="sr-only">미팅 정보</legend>

        <section className="flex flex-col gap-5">
          <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>고객</h3>
          <FormField look="kkiru" label="고객" required>
            {isEdit ? (
              <p className="flex h-11 items-center gap-3 text-[15px] font-semibold">
                {meeting.customer.name}
                <span
                  className="font-mono text-xs font-medium text-[var(--muted)]/70"
                  translate="no"
                >
                  {meeting.customer.code}
                </span>
              </p>
            ) : (
              <KkiruCustomerPicker
                initialCode={initialCustomerCode}
                onChange={(customer) => update('customer', customer)}
                value={values.customer}
              />
            )}
          </FormField>
          <FormField look="kkiru" htmlFor={id('title')} label="제목" required>
            <input
              className={INPUT_CLASS_NAME}
              id={id('title')}
              maxLength={100}
              onChange={(e) => update('title', e.target.value)}
              placeholder="예: 연남동 카페 자리"
              required
              value={values.title}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('meet-date')} label="미팅 일시" required>
            <div className="flex flex-wrap gap-2">
              <input
                aria-label="미팅 날짜"
                className={`${INPUT_CLASS_NAME} sm:w-48`}
                id={id('meet-date')}
                onChange={(e) => update('meetDate', e.target.value)}
                required
                type="date"
                value={values.meetDate}
              />
              <input
                aria-label="미팅 시간"
                className={`${INPUT_CLASS_NAME} sm:w-36`}
                onChange={(e) => update('meetTime', e.target.value)}
                required
                step={600}
                type="time"
                value={values.meetTime}
              />
            </div>
          </FormField>
          <FormField look="kkiru" label="유입 경로" required>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {INFLOW_SOURCES.map((source) => (
                  <button
                    aria-pressed={values.inflowSource === source}
                    className={chipClassName(values.inflowSource === source, 'card')}
                    key={source}
                    onClick={() => update('inflowSource', source)}
                    type="button"
                  >
                    {INFLOW_SOURCE_LABELS[source]}
                  </button>
                ))}
              </div>
              {values.inflowSource === 'other' ? (
                <input
                  aria-label="기타 유입 경로"
                  className={`${INPUT_CLASS_NAME} sm:w-64`}
                  maxLength={100}
                  onChange={(e) => update('inflowSourceDetail', e.target.value)}
                  placeholder="유입 경로 직접 입력"
                  value={values.inflowSourceDetail}
                />
              ) : null}
            </div>
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>희망 조건</h3>
          <FormField look="kkiru" htmlFor={id('area')} label="관심 상권" required>
            <input
              className={INPUT_CLASS_NAME}
              id={id('area')}
              maxLength={200}
              onChange={(e) => update('interestArea', e.target.value)}
              required
              value={values.interestArea}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('business')} label="희망 업종" required>
            <input
              className={INPUT_CLASS_NAME}
              id={id('business')}
              maxLength={200}
              onChange={(e) => update('desiredBusiness', e.target.value)}
              required
              value={values.desiredBusiness}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('pyeong')} label="희망 평수" required>
            <PyeongRange
              idPrefix={idPrefix}
              onChange={(field, text) => update(field, text)}
              values={values}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('floor')} label="희망 층수" required>
            <input
              className={`${INPUT_CLASS_NAME} sm:w-48`}
              id={id('floor')}
              maxLength={50}
              onChange={(e) => update('desiredFloor', e.target.value)}
              placeholder="예: 1층, 1~2층"
              required
              value={values.desiredFloor}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>금액</h3>
          <FormField look="kkiru" htmlFor={id('rent')} label="희망 임대료" required>
            <ManwonInput
              id={id('rent')}
              onChange={(text) => update('rentText', text)}
              required
              value={values.rentText}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('deposit')} label="최대 가용 보증금" required>
            <ManwonInput
              id={id('deposit')}
              onChange={(text) => update('depositText', text)}
              required
              value={values.depositText}
            />
          </FormField>
          <FormField look="kkiru" htmlFor={id('premium')} label="최대 가용 권리금" required>
            <ManwonInput
              id={id('premium')}
              onChange={(text) => update('premiumText', text)}
              required
              value={values.premiumText}
            />
          </FormField>
          <FormField look="kkiru" label="예산">
            <p className="flex h-11 items-center text-[15px] font-bold tabular-nums sm:w-56 sm:justify-end sm:pr-3.5">
              {formatManwon(budget)}
            </p>
          </FormField>
        </section>

        {isEdit ? null : (
          <section className="flex flex-col gap-5">
            <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>미팅 내용</h3>
            <FormField look="kkiru" htmlFor={id('content')} label="미팅 내용" required>
              <textarea
                className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-40`}
                id={id('content')}
                maxLength={5000}
                onChange={(e) => update('content', e.target.value)}
                required
                value={values.content}
              />
            </FormField>
          </section>
        )}
      </fieldset>

      <footer className="mt-8 flex flex-col gap-3">
        {errorMessage ? (
          <p className={ERROR_BOX_CLASS_NAME} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Link
            className={SECONDARY_BUTTON_CLASS_NAME}
            href={isEdit ? `/kkiru/meetings/${meeting.code}` : '/kkiru/meetings'}
          >
            취소
          </Link>
          <button className={PRIMARY_BUTTON_CLASS_NAME} disabled={isSubmitting} type="submit">
            {isSubmitting ? '저장 중...' : isEdit ? '저장' : '미팅 만들기'}
          </button>
        </div>
      </footer>
    </form>
  );
}
