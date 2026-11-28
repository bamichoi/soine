'use client';

import { type FormEvent, useId, useState } from 'react';
import { Icon } from '@/components/icon';
import { formatInquiryDate, getSeoulToday } from '@/lib/choidolsang-inquiries-api';

export type KkiruLogEntry = {
  id: string;
  recordedOn: string;
  content: string;
  /** 사유 기록이면 그 종류 (예: 진행중단 사유) */
  label?: string | null;
};

type LogInput = { recordedOn: string; content: string };

type KkiruLogPanelProps = {
  title: string;
  entries: KkiruLogEntry[];
  onAdd: (input: LogInput) => Promise<void>;
  onUpdate: (id: string, input: LogInput) => Promise<void>;
};

const CONTROL_CLASS_NAME =
  'w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] disabled:opacity-60';

function LogForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: LogInput;
  submitLabel: string;
  onSubmit: (input: LogInput) => Promise<void>;
  onCancel: () => void;
}) {
  const idPrefix = useId();
  const [recordedOn, setRecordedOn] = useState(() => initial?.recordedOn ?? getSeoulToday());
  const [content, setContent] = useState(initial?.content ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setErrorMessage('내용을 입력해 주세요.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await onSubmit({ content: content.trim(), recordedOn });
    } catch {
      setErrorMessage('기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-3" disabled={isSubmitting}>
        <legend className="sr-only">{submitLabel}</legend>
        <label
          className="flex flex-col gap-1.5 text-xs text-[var(--muted)]"
          htmlFor={`${idPrefix}-date`}
        >
          날짜
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
          내용
          <textarea
            className={`${CONTROL_CLASS_NAME} min-h-28 resize-y py-2.5 leading-relaxed`}
            id={`${idPrefix}-content`}
            maxLength={5000}
            onChange={(event) => setContent(event.target.value)}
            required
            value={content}
          />
        </label>
      </fieldset>
      {errorMessage ? (
        <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          className="h-9 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--background)]"
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          취소
        </button>
        <button
          className="h-9 bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? '저장 중...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function LogItem({
  entry,
  onUpdate,
}: {
  entry: KkiruLogEntry;
  onUpdate: (id: string, input: LogInput) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="py-4 first:pt-0 last:pb-0">
        <LogForm
          initial={{ content: entry.content, recordedOn: entry.recordedOn }}
          onCancel={() => setIsEditing(false)}
          onSubmit={async (input) => {
            await onUpdate(entry.id, input);
            setIsEditing(false);
          }}
          submitLabel="저장"
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      {entry.label ? (
        <span className="w-fit bg-[var(--surface)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--warning)]">
          {entry.label}
        </span>
      ) : null}
      <p className="text-[15px] leading-7 break-words whitespace-pre-wrap">{entry.content}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">- {formatInquiryDate(entry.recordedOn)}</p>
        <button
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => setIsEditing(true)}
          type="button"
        >
          수정
        </button>
      </div>
    </li>
  );
}

// 로그 방식 기록. 첫 기록이 처음 내용이고, 기록 추가로 이어서 쓴다. 기록은 고칠 수만 있다.
export function KkiruLogPanel({ title, entries, onAdd, onUpdate }: KkiruLogPanelProps) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section aria-label={title} className="flex flex-col gap-4 bg-[var(--background)] px-5 py-4">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-xs text-[var(--muted)]">{title}</h3>
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
        {entries.map((entry) => (
          <LogItem entry={entry} key={entry.id} onUpdate={onUpdate} />
        ))}
      </ol>
      {isAdding ? (
        <div className="border-t border-[var(--line)] pt-4">
          <LogForm
            onCancel={() => setIsAdding(false)}
            onSubmit={async (input) => {
              await onAdd(input);
              setIsAdding(false);
            }}
            submitLabel="추가"
          />
        </div>
      ) : null}
    </section>
  );
}
