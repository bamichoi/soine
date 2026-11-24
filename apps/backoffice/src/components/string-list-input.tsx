'use client';

import { type KeyboardEvent, useState } from 'react';
import { Icon } from '@/components/icon';
import { createStringListItem, type StringListItem } from '@/lib/string-list';

type StringListInputProps = {
  inputId: string;
  items: StringListItem[];
  onChange: (items: StringListItem[]) => void;
  placeholder: string;
  maxCount: number;
  maxLength: number;
  /** 목록의 보조기기용 이름 (예: "추가한 구성품") */
  listLabel: string;
};

const CONTROL_CLASS_NAME =
  'h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60';

// 한 칸에 적고 + 로 목록에 더한다. 더한 항목은 x 로 뺀다.
export function StringListInput({
  inputId,
  items,
  onChange,
  placeholder,
  maxCount,
  maxLength,
  listLabel,
}: StringListInputProps) {
  const [draft, setDraft] = useState('');
  const isFull = items.length >= maxCount;

  function addDraft() {
    const value = draft.trim();

    if (!value || isFull) {
      return;
    }

    onChange([...items, createStringListItem(value)]);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중 Enter는 글자 확정이므로 무시한다.
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      addDraft();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className={CONTROL_CLASS_NAME}
          disabled={isFull}
          id={inputId}
          maxLength={maxLength}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={draft}
        />
        <button
          className="flex h-10 shrink-0 items-center gap-1 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!draft.trim() || isFull}
          onClick={addDraft}
          type="button"
        >
          <Icon className="size-4" name="plus" />
          추가
        </button>
      </div>
      {items.length > 0 ? (
        <ul aria-label={listLabel} className="flex flex-col">
          {items.map((item) => (
            <li
              className="flex items-center justify-between gap-2 border-b border-[var(--line)] py-2 text-sm last:border-b-0"
              key={item.key}
            >
              <span className="min-w-0 break-words">{item.value}</span>
              <button
                aria-label={`${item.value} 빼기`}
                className="flex size-7 shrink-0 items-center justify-center text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                onClick={() => onChange(items.filter((other) => other.key !== item.key))}
                type="button"
              >
                <Icon className="size-4" name="x" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
