'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { FormField } from '@/components/form-field';
import { KkiruListingPicker } from '@/components/kkiru-listing-picker';
import { AdminApiError } from '@/lib/admin-auth-api';
import { getSeoulToday, toSeoulDateAndTime } from '@/lib/choidolsang-inquiries-api';
import {
  type ConsultationDetail,
  createMeeting,
  type MeetingDetail,
  updateMeeting,
} from '@/lib/kkiru-cases-api';
import { formatManwon } from '@/lib/kkiru-format';
import type { KkiruListingOption } from '@/lib/kkiru-listings-api';

const CONTROL_CLASS_NAME =
  'h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60';

type KkiruMeetingFormProps =
  | { mode: 'create'; consultation: ConsultationDetail }
  | { mode: 'edit'; meeting: MeetingDetail };

function errorText(error: unknown): string {
  if (error instanceof AdminApiError && error.status === 409) {
    return '이미 계약완료된 매물이거나, 계약이 진행된 미팅이라 매물을 바꿀 수 없습니다.';
  }

  return error instanceof AdminApiError && error.status === 400
    ? '입력한 내용을 다시 확인해 주세요.'
    : '미팅을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function validateMeeting(values: {
  listing: KkiruListingOption | null;
  date: string;
  time: string;
  content: string;
  isEdit: boolean;
}): string | null {
  if (!values.listing) {
    return '대상 매물을 골라 주세요.';
  }

  if (!(values.date && values.time)) {
    return '미팅 날짜와 시간을 입력해 주세요.';
  }

  return values.isEdit || values.content.trim() ? null : '미팅 내용을 입력해 주세요.';
}

function describeTarget(props: KkiruMeetingFormProps) {
  if (props.mode === 'edit') {
    return {
      caseCode: props.meeting.caseCode,
      customerName: props.meeting.customer.name,
      title: props.meeting.consultationTitle,
    };
  }

  return {
    caseCode: props.consultation.code,
    customerName: props.consultation.customer.name,
    title: props.consultation.title,
  };
}

export function KkiruMeetingForm(props: KkiruMeetingFormProps) {
  const router = useRouter();
  const idPrefix = useId();
  const isEdit = props.mode === 'edit';
  const initialAt = isEdit
    ? toSeoulDateAndTime(props.meeting.meetAt)
    : { date: getSeoulToday(), time: '' };
  const [listing, setListing] = useState<KkiruListingOption | null>(
    isEdit ? props.meeting.listing : null,
  );
  const [date, setDate] = useState(initialAt.date);
  const [time, setTime] = useState(initialAt.time);
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canChangeListing = !isEdit || ['meeting', 'stopped'].includes(props.meeting.status);
  const { caseCode, customerName, title } = describeTarget(props);
  const cancelHref = isEdit
    ? `/kkiru/meetings/${props.meeting.id}`
    : `/kkiru/consultations/${caseCode}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const invalid = validateMeeting({ content, date, isEdit, listing, time });

    if (invalid || !listing) {
      setErrorMessage(invalid ?? '대상 매물을 골라 주세요.');
      return;
    }

    const meetAt = `${date}T${time}:00+09:00`;
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved = isEdit
        ? await updateMeeting(props.meeting.id, { listingId: listing.id, meetAt })
        : await createMeeting({
            consultationCode: caseCode,
            content: content.trim(),
            listingId: listing.id,
            meetAt,
          });
      router.push(`/kkiru/meetings/${saved.id}`);
    } catch (error) {
      setErrorMessage(errorText(error));
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-label={isEdit ? '미팅 수정' : '미팅 진행'}
      className="border border-[var(--line)] bg-[var(--surface)] px-5 py-5"
      onSubmit={handleSubmit}
    >
      <p className="mb-6 bg-[var(--background)] px-4 py-3 text-sm">
        <span className="text-[var(--muted)]">케이스 </span>
        <span className="font-mono">{caseCode}</span>
        <span className="text-[var(--muted)]"> · </span>
        {title}
        <span className="text-[var(--muted)]"> · </span>
        {customerName}
      </p>

      <fieldset className="flex flex-col gap-5" disabled={isSubmitting}>
        <legend className="sr-only">미팅 정보</legend>
        <FormField label="대상 매물" required>
          <div className="flex flex-col gap-2">
            {listing ? (
              <div className="flex flex-wrap items-center gap-3 border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-2 text-sm">
                <span className="font-mono text-xs">{listing.code}</span>
                <span className="font-medium">{listing.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  보증금 {formatManwon(listing.deposit)} / 월 {formatManwon(listing.rent)}
                </span>
                {canChangeListing ? (
                  <button
                    className="ml-auto text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                    onClick={() => setListing(null)}
                    type="button"
                  >
                    다른 매물
                  </button>
                ) : null}
              </div>
            ) : (
              <KkiruListingPicker
                onPick={setListing}
                suggestions={isEdit ? [] : props.consultation.listings}
              />
            )}
          </div>
        </FormField>
        <FormField htmlFor={`${idPrefix}-date`} label="미팅 일시" required>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="미팅 날짜"
              className={`${CONTROL_CLASS_NAME} sm:w-48`}
              id={`${idPrefix}-date`}
              onChange={(e) => setDate(e.target.value)}
              required
              type="date"
              value={date}
            />
            <input
              aria-label="미팅 시간"
              className={`${CONTROL_CLASS_NAME} sm:w-36`}
              onChange={(e) => setTime(e.target.value)}
              required
              step={600}
              type="time"
              value={time}
            />
          </div>
        </FormField>
        {isEdit ? null : (
          <FormField htmlFor={`${idPrefix}-content`} label="미팅 내용" required>
            <textarea
              className={`${CONTROL_CLASS_NAME} h-auto min-h-32 resize-y py-2.5 leading-relaxed`}
              id={`${idPrefix}-content`}
              maxLength={5000}
              onChange={(e) => setContent(e.target.value)}
              required
              value={content}
            />
          </FormField>
        )}
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
            {isSubmitting ? '저장 중...' : isEdit ? '저장' : '미팅 만들기'}
          </button>
        </div>
      </footer>
    </form>
  );
}
