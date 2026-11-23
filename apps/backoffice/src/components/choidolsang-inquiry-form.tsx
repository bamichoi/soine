'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useId, useState } from 'react';
import { ConceptSelect } from '@/components/concept-select';
import { Icon } from '@/components/icon';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  CREATABLE_INQUIRY_STATUSES,
  type CreateInquiryInput,
  createInquiry,
  getInquiry,
  getSeoulToday,
  INQUIRY_CONTENT_MAX_LENGTH,
  INQUIRY_SHORT_TEXT_MAX_LENGTH,
  INQUIRY_STATUS_LABELS,
  type InquiryDetail,
  type InquiryStatus,
  REJECTION_REASON_MAX_LENGTH,
  toSeoulDateAndTime,
  type UpdateInquiryInput,
  updateInquiry,
} from '@/lib/choidolsang-inquiries-api';

const LIST_PATH = '/choidolsang/inquiries';

const CONTROL_CLASS_NAME =
  'w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60';

function Field({
  label,
  htmlFor,
  required = false,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <label className="pt-2 text-sm font-medium" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[var(--error)]">
            *
          </span>
        ) : null}
      </label>
      <div className="flex min-w-0 flex-col gap-1.5">
        {children}
        {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

// 희망 예약 날짜와 시간은 둘 다 입력하거나 둘 다 비운다. 한국 시간으로 보낸다.
function toDesiredReservationAt(date: string, time: string): string | null | 'invalid' {
  if (!date && !time) {
    return null;
  }

  if (!date || !time) {
    return 'invalid';
  }

  return `${date}T${time}:00+09:00`;
}

type FormValues = {
  inquiredOn: string;
  content: string;
  reservationDate: string;
  reservationTime: string;
  location: string;
  desiredConceptId: string;
  status: InquiryStatus;
  rejectionReason: string;
};

/** 입력값을 검사해 보낼 값을 만든다. 문제가 있으면 안내 문구를 돌려준다. */
function buildCreateInput(values: FormValues): CreateInquiryInput | string {
  if (!values.content.trim()) {
    return '문의 내용을 입력해 주세요.';
  }

  const desiredReservationAt = toDesiredReservationAt(
    values.reservationDate,
    values.reservationTime,
  );

  if (desiredReservationAt === 'invalid') {
    return '희망 예약은 날짜와 시간을 함께 입력하거나 둘 다 비워 주세요.';
  }

  const isRejected = values.status === 'rejected';

  if (isRejected && !values.rejectionReason.trim()) {
    return '거절 사유를 입력해 주세요.';
  }

  return {
    content: values.content.trim(),
    desiredConceptId: values.desiredConceptId || null,
    desiredReservationAt,
    inquiredOn: values.inquiredOn,
    location: values.location.trim() || null,
    rejectionReason: isRejected ? values.rejectionReason.trim() : null,
    status: values.status,
  };
}

function toUpdateInput(input: CreateInquiryInput, isRejected: boolean): UpdateInquiryInput {
  const fields = {
    desiredConceptId: input.desiredConceptId,
    desiredReservationAt: input.desiredReservationAt,
    location: input.location,
  };

  return isRejected && input.rejectionReason
    ? { ...fields, rejectionReason: input.rejectionReason }
    : fields;
}

function getSubmitErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError && error.status === 400) {
    return '입력한 내용을 다시 확인해 주세요.';
  }

  if (error instanceof AdminApiError && error.status === 409) {
    return '그사이 문의 상태가 바뀌었습니다. 새로고침 후 다시 수정해 주세요.';
  }

  if (error instanceof AdminApiError && error.status === 404) {
    return '삭제되었거나 없는 문의입니다.';
  }

  return '문의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

type ChoidolsangInquiryFormProps = {
  /** 있으면 수정 폼. 상태는 고칠 수 없고, 거절된 문의만 거절 사유를 고친다. */
  inquiry?: InquiryDetail;
};

export function ChoidolsangInquiryForm({ inquiry }: ChoidolsangInquiryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const querySuffix = listQuery ? `?${listQuery}` : '';
  const isEdit = inquiry !== undefined;
  const cancelHref = isEdit
    ? `${LIST_PATH}/${inquiry.code}${querySuffix}`
    : `${LIST_PATH}${querySuffix}`;
  const initialReservation = inquiry?.desiredReservationAt
    ? toSeoulDateAndTime(inquiry.desiredReservationAt)
    : { date: '', time: '' };
  const idPrefix = useId();
  const [inquiredOn, setInquiredOn] = useState(() => inquiry?.inquiredOn ?? getSeoulToday());
  const [content, setContent] = useState(inquiry?.content ?? '');
  const [reservationDate, setReservationDate] = useState(initialReservation.date);
  const [reservationTime, setReservationTime] = useState(initialReservation.time);
  const [location, setLocation] = useState(inquiry?.location ?? '');
  const [desiredConceptId, setDesiredConceptId] = useState(inquiry?.desiredConcept?.id ?? '');
  const [status, setStatus] = useState<InquiryStatus>(inquiry?.status ?? 'pending');
  const [rejectionReason, setRejectionReason] = useState(inquiry?.rejectionReason ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildCreateInput({
      content,
      desiredConceptId,
      inquiredOn,
      location,
      rejectionReason,
      reservationDate,
      reservationTime,
      status,
    });

    if (typeof result === 'string') {
      setErrorMessage(result);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved = isEdit
        ? await updateInquiry(inquiry.code, toUpdateInput(result, status === 'rejected'))
        : await createInquiry(result);
      router.push(`${LIST_PATH}/${saved.code}${querySuffix}`);
    } catch (error) {
      setErrorMessage(getSubmitErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form
      aria-label={isEdit ? '문의 수정' : '문의 추가'}
      className="border border-[var(--line)] bg-[var(--surface)] px-5 py-5"
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-5" disabled={isSubmitting}>
        <legend className="sr-only">문의 정보</legend>

        {/* 수정할 때 문의 날짜·내용은 상세의 문의 내용 로그에서 기록별로 고친다. */}
        {isEdit ? null : (
          <>
            <Field htmlFor={id('inquired-on')} label="문의 날짜" required>
              <input
                className={`${CONTROL_CLASS_NAME} h-10 sm:w-48`}
                id={id('inquired-on')}
                onChange={(event) => setInquiredOn(event.target.value)}
                required
                type="date"
                value={inquiredOn}
              />
            </Field>

            <Field
              hint={`${content.length.toLocaleString()} / ${INQUIRY_CONTENT_MAX_LENGTH.toLocaleString()}자`}
              htmlFor={id('content')}
              label="문의 내용"
              required
            >
              <textarea
                className={`${CONTROL_CLASS_NAME} min-h-40 resize-y py-2.5 leading-relaxed`}
                id={id('content')}
                maxLength={INQUIRY_CONTENT_MAX_LENGTH}
                onChange={(event) => setContent(event.target.value)}
                placeholder="고객이 남긴 문의 내용을 입력해 주세요."
                required
                value={content}
              />
            </Field>
          </>
        )}

        <Field
          hint="날짜와 시간을 함께 입력해 주세요. 한국 시간 기준입니다."
          htmlFor={id('reservation-date')}
          label="희망 예약일시"
        >
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="희망 예약 날짜"
              className={`${CONTROL_CLASS_NAME} h-10 sm:w-48`}
              id={id('reservation-date')}
              onChange={(event) => setReservationDate(event.target.value)}
              type="date"
              value={reservationDate}
            />
            <input
              aria-label="희망 예약 시간"
              className={`${CONTROL_CLASS_NAME} h-10 sm:w-36`}
              onChange={(event) => setReservationTime(event.target.value)}
              step={600}
              type="time"
              value={reservationTime}
            />
          </div>
        </Field>

        <Field htmlFor={id('location')} label="장소">
          <input
            className={`${CONTROL_CLASS_NAME} h-10`}
            id={id('location')}
            maxLength={INQUIRY_SHORT_TEXT_MAX_LENGTH}
            onChange={(event) => setLocation(event.target.value)}
            value={location}
          />
        </Field>

        <Field htmlFor={id('desired-concept')} label="희망 돌상 컨셉">
          <ConceptSelect
            current={inquiry?.desiredConcept ?? null}
            id={id('desired-concept')}
            onChange={setDesiredConceptId}
            value={desiredConceptId}
          />
        </Field>

        {isEdit ? null : (
          <Field htmlFor={id('status')} label="상태" required>
            <div className="relative sm:w-48">
              <select
                className={`${CONTROL_CLASS_NAME} h-10 appearance-none pr-9`}
                id={id('status')}
                onChange={(event) => setStatus(event.target.value as InquiryStatus)}
                value={status}
              >
                {CREATABLE_INQUIRY_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {INQUIRY_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              <Icon
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--muted)]"
                name="chevron-down"
              />
            </div>
          </Field>
        )}

        {status === 'rejected' ? (
          <Field
            hint={`${rejectionReason.length.toLocaleString()} / ${REJECTION_REASON_MAX_LENGTH.toLocaleString()}자`}
            htmlFor={id('rejection-reason')}
            label="거절 사유"
            required
          >
            <textarea
              className={`${CONTROL_CLASS_NAME} min-h-28 resize-y py-2.5 leading-relaxed`}
              id={id('rejection-reason')}
              maxLength={REJECTION_REASON_MAX_LENGTH}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="고객에게 안내할 거절 사유를 입력해 주세요."
              required
              value={rejectionReason}
            />
          </Field>
        ) : null}
      </fieldset>

      <footer className="mt-6 flex flex-col gap-3">
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

type EditLoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; inquiry: InquiryDetail };

/** 문의를 불러와 수정 폼을 보여 준다. */
export function ChoidolsangInquiryEditForm({ code }: { code: string }) {
  const [state, setState] = useState<EditLoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    getInquiry(code)
      .then((inquiry) => {
        if (isActive) {
          setState({ inquiry, kind: 'loaded' });
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
    return <p className="py-10 text-sm text-[var(--muted)]">문의를 불러오고 있습니다.</p>;
  }

  if (state.kind === 'not-found') {
    return <p className="py-10 text-sm text-[var(--muted)]">해당 문의를 찾을 수 없습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="py-10 text-sm text-[var(--error)]" role="alert">
        문의를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return <ChoidolsangInquiryForm inquiry={state.inquiry} />;
}
