'use client';

import { type FormEvent, useId, useState } from 'react';
import { Icon } from '@/components/icon';
import { GroupHead } from '@/components/page-parts';
import { formatInquiryDate, getSeoulToday } from '@/lib/choidolsang-inquiries-api';
import { formatCount } from '@/lib/goodplace-format';
import {
  CARD_CLASS_NAME,
  chipClassName,
  ERROR_BOX_CLASS_NAME,
  FAINT_CLASS_NAME,
  INPUT_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  REASON_TAG_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
  SMALL_BUTTON_CLASS_NAME,
  TAG_CLASS_NAME,
  TEXT_BUTTON_CLASS_NAME,
} from '@/lib/ui';

export type LogListing = { id: string; name: string };

export type LogEntry = {
  id: string;
  recordedOn: string;
  content: string;
  /** 사유 기록이면 그 종류 (예: 진행중단 사유) */
  label?: string | null;
  /** 관련 매물. 본문 앞 회색 태그로 보인다. */
  listing?: LogListing | null;
};

/** listingId가 null이면 관련 매물 없음 (수정할 때는 연결을 끊는다) */
type LogInput = { recordedOn: string; content: string; listingId: string | null };

type LogPanelProps = {
  title: string;
  entries: LogEntry[];
  /** 없으면 읽기 전용 (계약 히스토리) */
  onAdd?: (input: LogInput) => Promise<void>;
  onUpdate?: (id: string, input: LogInput) => Promise<void>;
  /** 기록에 관련 매물로 고를 수 있는 매물 (미팅 매물). 없으면 '관련 매물' 칸을 숨긴다. */
  listingOptions?: LogListing[];
  emptyText?: string;
  /** 내용 칸 안내 글 */
  placeholder?: string;
  /** 저장 실패 문구. 없으면 공통 문구 */
  getErrorMessage?: (error: unknown) => string;
};

const DEFAULT_ERROR_MESSAGE = '기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const LABEL_CLASS_NAME = 'flex flex-col gap-1.5 text-[13px] font-semibold text-[var(--muted)]';

/** 고를 매물이 이보다 많으면 칩 대신 select로 보여 준다. */
const LISTING_CHIP_LIMIT = 3;

function ListingChoice({
  idPrefix,
  options,
  value,
  onChange,
}: {
  idPrefix: string;
  options: LogListing[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  if (options.length > LISTING_CHIP_LIMIT) {
    return (
      <label className={LABEL_CLASS_NAME} htmlFor={`${idPrefix}-listing`}>
        관련 매물
        <select
          className={`${INPUT_CLASS_NAME} cursor-pointer font-normal text-[var(--foreground)] sm:w-80`}
          id={`${idPrefix}-listing`}
          onChange={(event) => onChange(event.target.value || null)}
          value={value ?? ''}
        >
          <option value="">선택 안 함</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const choices = [{ id: null, name: '선택 안 함' }, ...options];

  return (
    <fieldset className={LABEL_CLASS_NAME}>
      <legend className="mb-1.5">관련 매물</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <button
            aria-pressed={value === choice.id}
            className={`${chipClassName(value === choice.id, 'card')} max-w-full`}
            key={choice.id ?? 'none'}
            onClick={() => onChange(choice.id)}
            type="button"
          >
            <span className="truncate">{choice.name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

type FormOptions = Pick<LogPanelProps, 'placeholder' | 'getErrorMessage'>;

function LogForm({
  initial,
  listingOptions,
  submitLabel,
  onSubmit,
  onCancel,
  placeholder,
  getErrorMessage,
}: FormOptions & {
  initial?: LogInput;
  listingOptions: LogListing[];
  submitLabel: string;
  onSubmit: (input: LogInput) => Promise<void>;
  onCancel: () => void;
}) {
  const idPrefix = useId();
  const [recordedOn, setRecordedOn] = useState(() => initial?.recordedOn ?? getSeoulToday());
  const [content, setContent] = useState(initial?.content ?? '');
  const [listingId, setListingId] = useState<string | null>(initial?.listingId ?? null);
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
      await onSubmit({ content: content.trim(), listingId, recordedOn });
    } catch (error) {
      setErrorMessage(getErrorMessage?.(error) ?? DEFAULT_ERROR_MESSAGE);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-3" disabled={isSubmitting}>
        <legend className="sr-only">{submitLabel}</legend>
        <label className={LABEL_CLASS_NAME} htmlFor={`${idPrefix}-date`}>
          날짜
          <input
            className={`${INPUT_CLASS_NAME} text-[var(--foreground)] sm:w-48`}
            id={`${idPrefix}-date`}
            onChange={(event) => setRecordedOn(event.target.value)}
            required
            type="date"
            value={recordedOn}
          />
        </label>
        <label className={LABEL_CLASS_NAME} htmlFor={`${idPrefix}-content`}>
          내용
          <textarea
            className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-28 font-normal text-[var(--foreground)]`}
            id={`${idPrefix}-content`}
            maxLength={5000}
            onChange={(event) => setContent(event.target.value)}
            placeholder={placeholder}
            required
            value={content}
          />
        </label>
        {listingOptions.length > 0 ? (
          <ListingChoice
            idPrefix={idPrefix}
            onChange={setListingId}
            options={listingOptions}
            value={listingId}
          />
        ) : null}
      </fieldset>
      {errorMessage ? (
        <p className={ERROR_BOX_CLASS_NAME} role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          className={SECONDARY_BUTTON_CLASS_NAME}
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          취소
        </button>
        <button className={PRIMARY_BUTTON_CLASS_NAME} disabled={isSubmitting} type="submit">
          {isSubmitting ? '저장 중...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function LogItem({
  entry,
  listingOptions,
  onUpdate,
  formOptions,
}: {
  formOptions: FormOptions;
  entry: LogEntry;
  listingOptions: LogListing[];
  onUpdate?: (id: string, input: LogInput) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { listing } = entry;

  if (isEditing && onUpdate) {
    // 미팅 매물에서 빠진 매물이 연결돼 있어도 그대로 둘 수 있게 선택지에 넣는다.
    const options =
      listing && !listingOptions.some((option) => option.id === listing.id)
        ? [...listingOptions, listing]
        : listingOptions;

    return (
      <li className="py-4">
        <LogForm
          {...formOptions}
          initial={{
            content: entry.content,
            listingId: listing?.id ?? null,
            recordedOn: entry.recordedOn,
          }}
          listingOptions={options}
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
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-3.5 md:grid-cols-[92px_minmax(0,1fr)_auto]">
      <span
        className={`order-3 col-span-2 text-[13px] tabular-nums md:order-none md:col-span-1 ${FAINT_CLASS_NAME}`}
      >
        {formatInquiryDate(entry.recordedOn)}
      </span>
      <p className="text-[15px] leading-7 break-words whitespace-pre-wrap">
        {entry.label ? (
          <span className={`mr-1.5 align-[1px] ${REASON_TAG_CLASS_NAME}`}>{entry.label}</span>
        ) : null}
        {listing ? (
          <span className={`mr-1.5 align-[1px] ${TAG_CLASS_NAME}`}>{listing.name}</span>
        ) : null}
        {entry.content}
      </p>
      {onUpdate ? (
        <button
          className={`${TEXT_BUTTON_CLASS_NAME} text-xs`}
          onClick={() => setIsEditing(true)}
          type="button"
        >
          수정
        </button>
      ) : (
        <span />
      )}
    </li>
  );
}

// 로그 방식 기록. 첫 기록이 처음 내용이고, 기록 추가로 이어서 쓴다. 기록은 고칠 수만 있다.
// 상세 맨 아래: 카드 밖 묶음 머리(+ 기록 추가) + 카드 안 날짜|본문|수정 줄.
export function LogPanel({
  title,
  entries,
  onAdd,
  onUpdate,
  listingOptions = [],
  emptyText = '아직 기록이 없습니다.',
  placeholder,
  getErrorMessage,
}: LogPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const formOptions = { getErrorMessage, placeholder };

  return (
    <>
      <GroupHead count={`${formatCount(entries.length)}건`} title={title}>
        {onAdd && !isAdding ? (
          <button
            className={SMALL_BUTTON_CLASS_NAME}
            onClick={() => setIsAdding(true)}
            type="button"
          >
            <Icon className="size-3.5" name="plus" />
            기록 추가
          </button>
        ) : null}
      </GroupHead>
      <section aria-label={title} className={`px-5 py-1 md:px-6 ${CARD_CLASS_NAME}`}>
        {entries.length > 0 ? (
          <ol className="divide-y divide-[var(--line)]/60">
            {entries.map((entry) => (
              <LogItem
                entry={entry}
                formOptions={formOptions}
                key={entry.id}
                listingOptions={listingOptions}
                onUpdate={onUpdate}
              />
            ))}
          </ol>
        ) : (
          <p className="py-10 text-center text-sm text-[var(--muted)]">{emptyText}</p>
        )}
        {isAdding && onAdd ? (
          <div className={`py-4 ${entries.length > 0 ? 'border-t border-[var(--line)]/60' : ''}`}>
            <LogForm
              {...formOptions}
              listingOptions={listingOptions}
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
    </>
  );
}
