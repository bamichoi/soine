'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { ConceptSelect } from '@/components/concept-select';
import { DataLoader } from '@/components/data-loader';
import { FormField } from '@/components/form-field';
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
import {
  chipClassName,
  ERROR_BOX_CLASS_NAME,
  HERO_CLASS_NAME,
  INPUT_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

const LIST_PATH = '/choidolsang/inquiries';

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
      className={HERO_CLASS_NAME}
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-5" disabled={isSubmitting}>
        <legend className="sr-only">문의 정보</legend>

        {/* 수정할 때 문의 날짜·내용은 상세의 문의 내용 로그에서 기록별로 고친다. */}
        {isEdit ? null : (
          <>
            <FormField htmlFor={id('inquired-on')} label="문의 날짜" required>
              <input
                className={`${INPUT_CLASS_NAME} sm:w-48`}
                id={id('inquired-on')}
                onChange={(event) => setInquiredOn(event.target.value)}
                required
                type="date"
                value={inquiredOn}
              />
            </FormField>

            <FormField
              hint={`${content.length.toLocaleString()} / ${INQUIRY_CONTENT_MAX_LENGTH.toLocaleString()}자`}
              htmlFor={id('content')}
              label="문의 내용"
              required
            >
              <textarea
                className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-40`}
                id={id('content')}
                maxLength={INQUIRY_CONTENT_MAX_LENGTH}
                onChange={(event) => setContent(event.target.value)}
                placeholder="고객이 남긴 문의 내용을 입력해 주세요."
                required
                value={content}
              />
            </FormField>
          </>
        )}

        <FormField
          hint="날짜와 시간을 함께 입력해 주세요. 한국 시간 기준입니다."
          htmlFor={id('reservation-date')}
          label="희망 예약일시"
        >
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="희망 예약 날짜"
              className={`${INPUT_CLASS_NAME} sm:w-48`}
              id={id('reservation-date')}
              onChange={(event) => setReservationDate(event.target.value)}
              type="date"
              value={reservationDate}
            />
            <input
              aria-label="희망 예약 시간"
              className={`${INPUT_CLASS_NAME} sm:w-36`}
              onChange={(event) => setReservationTime(event.target.value)}
              step={600}
              type="time"
              value={reservationTime}
            />
          </div>
        </FormField>

        <FormField htmlFor={id('location')} label="장소">
          <input
            className={INPUT_CLASS_NAME}
            id={id('location')}
            maxLength={INQUIRY_SHORT_TEXT_MAX_LENGTH}
            onChange={(event) => setLocation(event.target.value)}
            value={location}
          />
        </FormField>

        <FormField htmlFor={id('desired-concept')} label="희망 돌상 컨셉">
          <ConceptSelect
            current={inquiry?.desiredConcept ?? null}
            id={id('desired-concept')}
            onChange={setDesiredConceptId}
            value={desiredConceptId}
          />
        </FormField>

        {isEdit ? null : (
          <FormField label="상태" required>
            {/* 여러 개 중 하나를 반드시 고른다 (흰 카드 안 칩). */}
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">상태</legend>
              {CREATABLE_INQUIRY_STATUSES.map((value) => (
                <button
                  aria-pressed={status === value}
                  className={chipClassName(status === value, 'card')}
                  key={value}
                  onClick={() => setStatus(value)}
                  type="button"
                >
                  {INQUIRY_STATUS_LABELS[value]}
                </button>
              ))}
            </fieldset>
          </FormField>
        )}

        {status === 'rejected' ? (
          <FormField
            hint={`${rejectionReason.length.toLocaleString()} / ${REJECTION_REASON_MAX_LENGTH.toLocaleString()}자`}
            htmlFor={id('rejection-reason')}
            label="거절 사유"
            required
          >
            <textarea
              className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-28`}
              id={id('rejection-reason')}
              maxLength={REJECTION_REASON_MAX_LENGTH}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="고객에게 안내할 거절 사유를 입력해 주세요."
              required
              value={rejectionReason}
            />
          </FormField>
        ) : null}
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
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </footer>
    </form>
  );
}

/** 문의를 불러와 수정 폼을 보여 준다. */
export function ChoidolsangInquiryEditForm({ code }: { code: string }) {
  return (
    <DataLoader load={getInquiry} loadKey={code} noun="문의">
      {(inquiry) => <ChoidolsangInquiryForm inquiry={inquiry} />}
    </DataLoader>
  );
}
