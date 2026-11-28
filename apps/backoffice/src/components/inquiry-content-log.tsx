'use client';

import { type FormEvent, useId, useState } from 'react';
import { Icon } from '@/components/icon';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  addInquiryRecord,
  formatInquiryDate,
  getSeoulToday,
  INQUIRY_CONTENT_MAX_LENGTH,
  type InquiryDetail,
  type InquiryRecord,
  type InquiryRecordInput,
  updateInquiryRecord,
} from '@/lib/choidolsang-inquiries-api';

const CONTROL_CLASS_NAME =
  'w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] disabled:opacity-60';

const SMALL_BUTTON_CLASS_NAME =
  'h-9 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-60';

const SMALL_PRIMARY_BUTTON_CLASS_NAME =
  'h-9 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60';

const TEXT_BUTTON_CLASS_NAME =
  'text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-60';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminApiError && error.status === 404) {
    return '없는 기록입니다. 화면을 새로고침해 주세요.';
  }

  return fallback;
}

function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
      {message}
    </p>
  ) : null;
}

type RecordFormProps = {
  label: string;
  initial?: InquiryRecordInput;
  submitLabel: string;
  onSubmit: (input: InquiryRecordInput) => Promise<void>;
  onCancel: () => void;
};

function RecordForm({ label, initial, submitLabel, onSubmit, onCancel }: RecordFormProps) {
  const idPrefix = useId();
  const [recordedOn, setRecordedOn] = useState(() => initial?.recordedOn ?? getSeoulToday());
  const [content, setContent] = useState(initial?.content ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setErrorMessage('기록 내용을 입력해 주세요.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await onSubmit({ content: content.trim(), recordedOn });
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, '기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form aria-label={label} className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-3" disabled={isSubmitting}>
        <legend className="sr-only">{label}</legend>
        <label
          className="flex flex-col gap-1.5 text-xs text-[var(--muted)]"
          htmlFor={`${idPrefix}-date`}
        >
          기록 날짜
          <input
            className={`${CONTROL_CLASS_NAME} h-10 sm:w-48`}
            id={`${idPrefix}-date`}
            onChange={(event) => setRecordedOn(event.target.value)}
            required
            type="date"
            value={recordedOn}
          />
        </label>
        <label
          className="flex flex-col gap-1.5 text-xs text-[var(--muted)]"
          htmlFor={`${idPrefix}-content`}
        >
          기록 내용
          <textarea
            className={`${CONTROL_CLASS_NAME} min-h-28 resize-y py-2.5 leading-relaxed`}
            id={`${idPrefix}-content`}
            maxLength={INQUIRY_CONTENT_MAX_LENGTH}
            onChange={(event) => setContent(event.target.value)}
            placeholder="고객이 남긴 문의 내용을 입력해 주세요."
            required
            value={content}
          />
        </label>
      </fieldset>
      <ErrorMessage message={errorMessage} />
      <div className="flex justify-end gap-2">
        <button
          className={SMALL_BUTTON_CLASS_NAME}
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          취소
        </button>
        <button
          className={`${SMALL_PRIMARY_BUTTON_CLASS_NAME} bg-[var(--brand)] hover:bg-[var(--brand-hover)]`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? '저장 중...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

type LogEntryProps = {
  code: string;
  record: InquiryRecord;
  onChange: (inquiry: InquiryDetail) => void;
};

// 기록은 고칠 수만 있고 지우지 않는다.
function LogEntry({ code, record, onChange }: LogEntryProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="py-4 first:pt-0 last:pb-0">
        <RecordForm
          initial={{ content: record.content, recordedOn: record.recordedOn }}
          label="기록 수정"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (input) => {
            const updated = await updateInquiryRecord(code, record.id, input);
            setIsEditing(false);
            onChange(updated);
          }}
          submitLabel="저장"
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      <p className="text-[15px] leading-7 break-words whitespace-pre-wrap">{record.content}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">- {formatInquiryDate(record.recordedOn)}</p>
        <button className={TEXT_BUTTON_CLASS_NAME} onClick={() => setIsEditing(true)} type="button">
          수정
        </button>
      </div>
    </li>
  );
}

type InquiryContentLogProps = {
  inquiry: InquiryDetail;
  onChange: (inquiry: InquiryDetail) => void;
};

// 문의 내용을 기록 날짜와 함께 로그처럼 쌓아 보여 준다. 첫 기록이 첫 문의다.
export function InquiryContentLog({ inquiry, onChange }: InquiryContentLogProps) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section
      aria-label="문의 내용"
      className="flex flex-col gap-4 bg-[var(--background)] px-5 py-4"
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-xs text-[var(--muted)]">문의 내용</h3>
        {isAdding ? null : (
          <button
            className="inline-flex h-8 items-center gap-1 border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium hover:bg-[var(--background)]"
            onClick={() => setIsAdding(true)}
            type="button"
          >
            <Icon className="size-3.5" name="plus" />
            기록 추가
          </button>
        )}
      </header>

      <ol className="flex flex-col divide-y divide-[var(--line)]">
        {inquiry.records.map((record) => (
          <LogEntry code={inquiry.code} key={record.id} onChange={onChange} record={record} />
        ))}
      </ol>

      {isAdding ? (
        <div className="border-t border-[var(--line)] pt-4">
          <RecordForm
            label="기록 추가"
            onCancel={() => setIsAdding(false)}
            onSubmit={async (input) => {
              const updated = await addInquiryRecord(inquiry.code, input);
              setIsAdding(false);
              onChange(updated);
            }}
            submitLabel="추가"
          />
        </div>
      ) : null}
    </section>
  );
}
