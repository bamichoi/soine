'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { ConceptSelect } from '@/components/concept-select';
import { DataLoader } from '@/components/data-loader';
import { FormField } from '@/components/form-field';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/page-parts';
import { StringListInput } from '@/components/string-list-input';
import { AdminApiError } from '@/lib/admin-auth-api';
import type { ConceptOption } from '@/lib/choidolsang-concepts-api';
import {
  getFirstLine,
  getInquiry,
  getSeoulToday,
  type InquiryDetail,
  toSeoulDateAndTime,
} from '@/lib/choidolsang-inquiries-api';
import {
  BABY_GENDER_LABELS,
  BABY_GENDERS,
  type BabyGender,
  createReservation,
  DEFAULT_DEPOSIT_AMOUNT,
  EXTRA_COMPONENT_MAX_LENGTH,
  EXTRA_COMPONENTS_MAX_COUNT,
  getReservation,
  RESERVATION_AMOUNT_MAX,
  RESERVATION_REQUESTS_MAX_LENGTH,
  type Reservation,
  type ReservationFieldsInput,
  updateReservation,
} from '@/lib/choidolsang-reservations-api';
import { formatWon, parseAmountText, toAmountText } from '@/lib/money';
import { formatPhone, isValidMobilePhone } from '@/lib/phone';
import { type StringListItem, toStringListItems, toStringListValues } from '@/lib/string-list';
import {
  chipClassName,
  ERROR_BOX_CLASS_NAME,
  FOCUS_CLASS_NAME,
  FORM_SECTION_TITLE_CLASS_NAME,
  HERO_CLASS_NAME,
  INPUT_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  INPUT_UNIT_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

const INQUIRIES_PATH = '/choidolsang/inquiries';
const RESERVATIONS_PATH = '/choidolsang/reservations';

type FormValues = {
  customerName: string;
  customerPhone: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  babyName: string;
  babyGender: BabyGender;
  conceptId: string;
  guestCountText: string;
  hasSnap: boolean;
  requests: string;
  extraComponents: StringListItem[];
  totalText: string;
  depositText: string;
  confirmedOn: string;
};

// 수정할 때는 저장된 예약 값으로 폼을 채운다.
function getValuesFromReservation(reservation: Reservation): FormValues {
  const event = toSeoulDateAndTime(reservation.eventAt);

  return {
    babyGender: reservation.babyGender,
    babyName: reservation.babyName,
    conceptId: reservation.concept.id,
    confirmedOn: reservation.confirmedOn,
    customerName: reservation.customerName,
    customerPhone: formatPhone(reservation.customerPhone),
    depositText: toAmountText(String(reservation.depositAmount)),
    eventDate: event.date,
    eventLocation: reservation.eventLocation,
    eventTime: event.time,
    extraComponents: toStringListItems(reservation.extraComponents),
    guestCountText: String(reservation.guestCount),
    hasSnap: reservation.hasSnap,
    requests: reservation.requests ?? '',
    totalText: toAmountText(String(reservation.totalAmount)),
  };
}

// 문의에 적힌 값으로 폼 기본값을 채운다.
function getInitialValues(inquiry: InquiryDetail): FormValues {
  const event = inquiry.desiredReservationAt
    ? toSeoulDateAndTime(inquiry.desiredReservationAt)
    : { date: '', time: '' };
  const concept = inquiry.desiredConcept;

  return {
    // 아기 성별은 둘 중 하나를 반드시 고른다. 기본은 남아.
    babyGender: 'boy',
    babyName: '',
    conceptId: concept && !concept.isDeleted ? concept.id : '',
    confirmedOn: getSeoulToday(),
    customerName: '',
    customerPhone: '',
    depositText: toAmountText(String(DEFAULT_DEPOSIT_AMOUNT)),
    eventDate: event.date,
    eventLocation: inquiry.location ?? '',
    eventTime: event.time,
    extraComponents: [],
    guestCountText: '',
    hasSnap: false,
    requests: '',
    totalText: '',
  };
}

function validateRequired(values: FormValues): string | null {
  if (!values.customerName.trim()) {
    return '예약자 성함을 입력해 주세요.';
  }

  if (!isValidMobilePhone(values.customerPhone)) {
    return '예약자 연락처를 010-0000-0000 형식으로 입력해 주세요.';
  }

  if (!(values.eventDate && values.eventTime)) {
    return '행사 날짜와 시간을 입력해 주세요.';
  }

  if (!values.eventLocation.trim()) {
    return '행사 장소를 입력해 주세요.';
  }

  if (!values.babyName.trim()) {
    return '아기 이름을 입력해 주세요.';
  }

  if (!Number(values.guestCountText)) {
    return '참석 인원을 1명 이상 입력해 주세요.';
  }

  if (!values.conceptId) {
    return '돌상 컨셉을 골라 주세요.';
  }

  return null;
}

/** 입력값을 검사해 보낼 값을 만든다. 문제가 있으면 안내 문구를 돌려준다. */
function buildInput(values: FormValues): ReservationFieldsInput | string {
  const requiredError = validateRequired(values);

  if (requiredError) {
    return requiredError;
  }

  const totalAmount = parseAmountText(values.totalText);
  const depositAmount = parseAmountText(values.depositText) ?? 0;

  if (totalAmount === null) {
    return '최종 결제 금액을 입력해 주세요.';
  }

  if (totalAmount > RESERVATION_AMOUNT_MAX || depositAmount > RESERVATION_AMOUNT_MAX) {
    return `금액은 ${formatWon(RESERVATION_AMOUNT_MAX)} 이하로 입력해 주세요.`;
  }

  if (depositAmount > totalAmount) {
    return '예약금은 최종 결제 금액보다 클 수 없습니다.';
  }

  return {
    babyGender: values.babyGender,
    babyName: values.babyName.trim(),
    conceptId: values.conceptId,
    confirmedOn: values.confirmedOn,
    customerName: values.customerName.trim(),
    customerPhone: values.customerPhone.replace(/\D/g, ''),
    depositAmount,
    // 행사 시간은 한국 시간으로 보낸다.
    eventAt: `${values.eventDate}T${values.eventTime}:00+09:00`,
    eventLocation: values.eventLocation.trim(),
    extraComponents: toStringListValues(values.extraComponents),
    guestCount: Number(values.guestCountText),
    hasSnap: values.hasSnap,
    requests: values.requests.trim() || null,
    totalAmount,
  };
}

function getSubmitErrorMessage(error: unknown, isEdit: boolean): string {
  if (error instanceof AdminApiError && error.status === 409) {
    return isEdit
      ? '완료되었거나 취소된 예약은 수정할 수 없습니다. 예약 상세를 확인해 주세요.'
      : '이미 예약이 만들어졌거나 예약할 수 없는 문의입니다. 문의 상세를 확인해 주세요.';
  }

  if (error instanceof AdminApiError && error.status === 404) {
    return '삭제되었거나 없는 문의입니다.';
  }

  if (error instanceof AdminApiError && error.status === 400) {
    return '입력한 내용을 다시 확인해 주세요. 삭제된 돌상 컨셉은 고를 수 없습니다.';
  }

  return '예약을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className={FORM_SECTION_TITLE_CLASS_NAME}>{children}</h3>;
}

/** 문의에서 새 예약을 만들거나, 예약중인 예약을 고친다. */
type FormTarget =
  | { kind: 'create'; inquiry: InquiryDetail }
  | { kind: 'edit'; reservation: Reservation };

function ReservationForm({ target }: { target: FormTarget }) {
  const router = useRouter();
  const idPrefix = useId();
  const isEdit = target.kind === 'edit';
  const inquiryCode = isEdit ? target.reservation.inquiryCode : target.inquiry.code;
  const inquirySummary = isEdit ? null : getFirstLine(target.inquiry.content);
  const [values, setValues] = useState(() =>
    isEdit ? getValuesFromReservation(target.reservation) : getInitialValues(target.inquiry),
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = (field: string) => `${idPrefix}-${field}`;
  const inquiryHref = `${INQUIRIES_PATH}/${inquiryCode}`;
  const cancelHref = isEdit ? `${RESERVATIONS_PATH}/${target.reservation.code}` : inquiryHref;
  const totalAmount = parseAmountText(values.totalText);
  const depositAmount = parseAmountText(values.depositText) ?? 0;

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  // 문의에서 고른 컨셉이 있으면 처음에 그 가격을 최종 결제 금액으로 채운다.
  function handleOptionsLoaded(options: ConceptOption[]) {
    const selected = options.find((option) => option.id === values.conceptId);

    if (selected) {
      setValues((current) =>
        current.totalText
          ? current
          : { ...current, totalText: toAmountText(String(selected.price)) },
      );
    }
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
      const reservation = isEdit
        ? await updateReservation(target.reservation.code, result)
        : await createReservation({ ...result, inquiryCode });
      router.push(`${RESERVATIONS_PATH}/${reservation.code}`);
    } catch (error) {
      setErrorMessage(getSubmitErrorMessage(error, isEdit));
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-label={isEdit ? '예약 수정' : '예약 확정'}
      className={HERO_CLASS_NAME}
      onSubmit={handleSubmit}
    >
      <Link
        className={`group mb-8 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[var(--background)] px-4 py-3 text-sm transition hover:bg-[var(--brand-soft)] ${FOCUS_CLASS_NAME}`}
        href={inquiryHref}
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-semibold text-[var(--muted)]">문의</span>
          <span className="shrink-0 font-mono text-[13px]" translate="no">
            {inquiryCode}
          </span>
          {inquirySummary ? <span className="truncate font-semibold">{inquirySummary}</span> : null}
        </span>
        <Icon
          className="size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5"
          name="chevron-right"
        />
      </Link>

      <fieldset className="flex flex-col gap-8" disabled={isSubmitting}>
        <legend className="sr-only">예약 정보</legend>

        <section className="flex flex-col gap-5">
          <SectionTitle>행사</SectionTitle>
          <FormField htmlFor={id('customer-name')} label="예약자 성함" required>
            <input
              className={`${INPUT_CLASS_NAME} sm:w-64`}
              id={id('customer-name')}
              maxLength={100}
              onChange={(event) => update('customerName', event.target.value)}
              required
              value={values.customerName}
            />
          </FormField>
          <FormField htmlFor={id('customer-phone')} label="예약자 연락처" required>
            <input
              autoComplete="off"
              className={`${INPUT_CLASS_NAME} tabular-nums sm:w-64`}
              id={id('customer-phone')}
              inputMode="tel"
              onChange={(event) => update('customerPhone', formatPhone(event.target.value))}
              placeholder="010-1234-5678"
              required
              type="tel"
              value={values.customerPhone}
            />
          </FormField>
          <FormField
            hint="한국 시간 기준입니다."
            htmlFor={id('event-date')}
            label="행사 날짜·시간"
            required
          >
            <div className="flex flex-wrap gap-2">
              <input
                aria-label="행사 날짜"
                className={`${INPUT_CLASS_NAME} sm:w-48`}
                id={id('event-date')}
                onChange={(event) => update('eventDate', event.target.value)}
                required
                type="date"
                value={values.eventDate}
              />
              <input
                aria-label="행사 시간"
                className={`${INPUT_CLASS_NAME} sm:w-36`}
                onChange={(event) => update('eventTime', event.target.value)}
                required
                step={600}
                type="time"
                value={values.eventTime}
              />
            </div>
          </FormField>
          <FormField htmlFor={id('event-location')} label="행사 장소" required>
            <input
              className={INPUT_CLASS_NAME}
              id={id('event-location')}
              maxLength={200}
              onChange={(event) => update('eventLocation', event.target.value)}
              required
              value={values.eventLocation}
            />
          </FormField>
          <FormField htmlFor={id('guest-count')} label="참석 인원" required>
            <div className="relative sm:w-40">
              <input
                className={`${INPUT_CLASS_NAME} pr-10 text-right tabular-nums`}
                id={id('guest-count')}
                inputMode="numeric"
                onChange={(event) =>
                  update('guestCountText', event.target.value.replace(/\D/g, '').slice(0, 5))
                }
                required
                value={values.guestCountText}
              />
              <span className={INPUT_UNIT_CLASS_NAME}>명</span>
            </div>
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <SectionTitle>아기</SectionTitle>
          <FormField htmlFor={id('baby-name')} label="아기 이름" required>
            <input
              className={`${INPUT_CLASS_NAME} sm:w-64`}
              id={id('baby-name')}
              maxLength={100}
              onChange={(event) => update('babyName', event.target.value)}
              required
              value={values.babyName}
            />
          </FormField>
          <FormField label="아기 성별" required>
            <ChoiceButtons
              label="아기 성별"
              onChange={(gender) => update('babyGender', gender)}
              options={BABY_GENDERS.map((gender) => ({
                label: BABY_GENDER_LABELS[gender],
                value: gender,
              }))}
              value={values.babyGender}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <SectionTitle>상품</SectionTitle>
          <FormField htmlFor={id('concept')} label="돌상 컨셉" required>
            <ConceptSelect
              current={isEdit ? target.reservation.concept : null}
              emptyLabel="돌상 컨셉을 골라 주세요"
              id={id('concept')}
              onChange={(conceptId, option) => {
                update('conceptId', conceptId);

                // 컨셉을 바꾸면 그 가격으로 최종 결제 금액을 다시 채운다. 필요하면 고쳐 쓴다.
                if (option) {
                  update('totalText', toAmountText(String(option.price)));
                }
              }}
              onOptionsLoaded={handleOptionsLoaded}
              value={values.conceptId}
            />
          </FormField>
          <FormField label="스냅 촬영" required>
            <ChoiceButtons
              label="스냅 촬영"
              onChange={(hasSnap) => update('hasSnap', hasSnap)}
              options={[
                { label: '포함', value: true },
                { label: '미포함', value: false },
              ]}
              value={values.hasSnap}
            />
          </FormField>
          <FormField
            hint="입력하고 추가를 누르거나 Enter를 치면 목록에 더해집니다."
            htmlFor={id('extra-components')}
            label="추가 요청 구성품"
          >
            <StringListInput
              inputId={id('extra-components')}
              items={values.extraComponents}
              listLabel="추가 요청 구성품"
              maxCount={EXTRA_COMPONENTS_MAX_COUNT}
              maxLength={EXTRA_COMPONENT_MAX_LENGTH}
              onChange={(items) => update('extraComponents', items)}
              placeholder="예: 풍선 장식"
            />
          </FormField>
          <FormField htmlFor={id('requests')} label="추가 요청 사항">
            <textarea
              className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-28`}
              id={id('requests')}
              maxLength={RESERVATION_REQUESTS_MAX_LENGTH}
              onChange={(event) => update('requests', event.target.value)}
              value={values.requests}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-5">
          <SectionTitle>금액</SectionTitle>
          <FormField
            hint="돌상 컨셉을 고르면 그 가격으로 채워집니다."
            htmlFor={id('total')}
            label="최종 결제 금액"
            required
          >
            <AmountInput
              id={id('total')}
              onChange={(text) => update('totalText', text)}
              value={values.totalText}
            />
          </FormField>
          <FormField htmlFor={id('deposit')} label="예약금" required>
            <AmountInput
              id={id('deposit')}
              onChange={(text) => update('depositText', text)}
              value={values.depositText}
            />
          </FormField>
          <FormField label="잔금">
            <p className="flex h-11 items-center px-3.5 text-[15px] font-bold tabular-nums sm:w-56 sm:justify-end">
              {totalAmount === null ? '-' : formatWon(totalAmount - depositAmount)}
            </p>
          </FormField>
          <FormField htmlFor={id('confirmed-on')} label="예약 확정 날짜" required>
            <input
              className={`${INPUT_CLASS_NAME} sm:w-48`}
              id={id('confirmed-on')}
              onChange={(event) => update('confirmedOn', event.target.value)}
              required
              type="date"
              value={values.confirmedOn}
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
          <button className={PRIMARY_BUTTON_CLASS_NAME} disabled={isSubmitting} type="submit">
            {isSubmitting ? '저장 중...' : isEdit ? '저장' : '예약 확정'}
          </button>
        </div>
      </footer>
    </form>
  );
}

type ChoiceButtonsProps<T extends string | boolean> = {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

// 둘 이상 중 하나를 반드시 고르는 칩 묶음 (흰 카드 안). 선택은 풀 수 없다.
function ChoiceButtons<T extends string | boolean>({
  label,
  options,
  value,
  onChange,
}: ChoiceButtonsProps<T>) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            aria-pressed={isSelected}
            className={chipClassName(isSelected, 'card')}
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}

function AmountInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="relative sm:w-56">
      <input
        className={`${INPUT_CLASS_NAME} pr-10 text-right tabular-nums`}
        id={id}
        inputMode="numeric"
        onChange={(event) => onChange(toAmountText(event.target.value))}
        placeholder="0"
        required
        value={value}
      />
      <span className={INPUT_UNIT_CLASS_NAME}>원</span>
    </div>
  );
}

/** 이미 예약이 있거나 고칠 수 없을 때 안내 카드 + 예약 보기 링크 */
function ReservationNotice({ text, reservationCode }: { text: string; reservationCode: string }) {
  return (
    <Notice
      text={
        <>
          {text}{' '}
          <Link
            className={`rounded-sm font-semibold text-[var(--brand)] underline underline-offset-2 hover:text-[var(--brand-hover)] ${FOCUS_CLASS_NAME}`}
            href={`${RESERVATIONS_PATH}/${reservationCode}`}
          >
            예약 보기
          </Link>
        </>
      }
    />
  );
}

/** 문의를 불러와 예약 폼을 연다. 이미 예약된 문의면 그 예약으로 안내한다. */
export function ChoidolsangReservationCreate({ inquiryCode }: { inquiryCode: string }) {
  return (
    <DataLoader load={getInquiry} loadKey={inquiryCode} noun="문의">
      {(inquiry) =>
        inquiry.reservationCode ? (
          <ReservationNotice
            reservationCode={inquiry.reservationCode}
            text="이미 예약이 만들어진 문의입니다."
          />
        ) : (
          <ReservationForm target={{ inquiry, kind: 'create' }} />
        )
      }
    </DataLoader>
  );
}

/** 예약을 불러와 수정 폼을 연다. 예약중이 아니면 수정할 수 없다고 안내한다. */
export function ChoidolsangReservationEdit({ code }: { code: string }) {
  return (
    <DataLoader load={getReservation} loadKey={code} noun="예약">
      {(reservation) =>
        reservation.status === 'reserved' ? (
          <ReservationForm target={{ kind: 'edit', reservation }} />
        ) : (
          <ReservationNotice
            reservationCode={reservation.code}
            text="완료되었거나 취소된 예약은 수정할 수 없습니다."
          />
        )
      }
    </DataLoader>
  );
}
