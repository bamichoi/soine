'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { Modal } from '@/components/modal';
import { type KkiruCustomerSummary, listKkiruCustomers } from '@/lib/kkiru-customers-api';
import {
  FAINT_CLASS_NAME,
  FOCUS_CLASS_NAME,
  INPUT_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/kkiru-ui';
import { EMPTY_LIST_QUERY } from '@/lib/list-query';
import { formatPhone } from '@/lib/phone';

type KkiruCustomerSearchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onPick: (customer: KkiruCustomerSummary) => void;
  /** 찾는 고객이 없을 때 고객 추가로 넘어간다. */
  onAddInstead: () => void;
};

type SearchState =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'error' }
  | { kind: 'done'; query: string; items: KkiruCustomerSummary[]; total: number };

function ResultMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  );
}

function CustomerResultRow({
  customer,
  onPick,
}: {
  customer: KkiruCustomerSummary;
  onPick: (customer: KkiruCustomerSummary) => void;
}) {
  return (
    <li>
      <button
        className={`group flex w-full cursor-pointer items-center gap-4 rounded-lg px-3 py-3 text-left text-sm hover:bg-[var(--brand-soft)] ${FOCUS_CLASS_NAME}`}
        onClick={() => onPick(customer)}
        type="button"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-bold">{customer.name}</span>
          <span className={`font-mono text-xs font-medium ${FAINT_CLASS_NAME}`} translate="no">
            {customer.code}
          </span>
        </span>
        <span className="shrink-0 tabular-nums">{formatPhone(customer.phone)}</span>
        <span className="w-14 shrink-0 text-right text-xs text-[var(--muted)] tabular-nums">
          미팅 {customer.meetingCount}건
        </span>
        <span className="w-8 shrink-0 text-right text-xs font-bold text-[var(--brand)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
          선택
        </span>
      </button>
    </li>
  );
}

function SearchResults({
  state,
  onPick,
  onAddInstead,
}: {
  state: SearchState;
  onPick: (customer: KkiruCustomerSummary) => void;
  onAddInstead: () => void;
}) {
  if (state.kind === 'idle') {
    return <ResultMessage>이름이나 전화번호 일부를 입력해 찾아 주세요.</ResultMessage>;
  }

  if (state.kind === 'searching') {
    return <ResultMessage>찾고 있습니다.</ResultMessage>;
  }

  if (state.kind === 'error') {
    return (
      <ResultMessage>
        <span className="text-[var(--error)]">
          고객을 찾지 못했습니다. 잠시 후 다시 시도해 주세요.
        </span>
      </ResultMessage>
    );
  }

  if (state.items.length === 0) {
    return (
      <ResultMessage>
        <span>
          <strong className="text-[var(--foreground)]">‘{state.query}’</strong>에 맞는 고객이
          없습니다.
        </span>
        <button
          className={`${SECONDARY_BUTTON_CLASS_NAME} text-[var(--foreground)]`}
          onClick={onAddInstead}
          type="button"
        >
          <Icon className="size-4" name="plus" />
          고객 추가
        </button>
      </ResultMessage>
    );
  }

  return (
    <section aria-label="검색 결과" className="flex flex-col gap-2">
      <h3 className="text-sm font-bold">
        검색 결과 <em className="text-[var(--brand)] not-italic tabular-nums">{state.total}명</em>
        {state.total > state.items.length ? (
          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
            앞의 {state.items.length}명만 보여 줍니다. 검색어를 더 자세히 입력해 주세요.
          </span>
        ) : null}
      </h3>
      <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto rounded-xl bg-[var(--background)] p-1">
        {state.items.map((customer) => (
          <CustomerResultRow customer={customer} key={customer.id} onPick={onPick} />
        ))}
      </ul>
    </section>
  );
}

// 등록된 고객을 이름이나 전화번호로 찾아 고르는 모달.
export function KkiruCustomerSearchDialog({
  isOpen,
  onClose,
  onPick,
  onAddInstead,
}: KkiruCustomerSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  // 열 때마다 처음 상태로 비운다.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setState({ kind: 'idle' });
    }
  }, [isOpen]);

  // 이 모달은 미팅 폼 안에 그려지므로 form을 겹쳐 쓰지 않고, Enter 키와 버튼으로 찾는다.
  async function handleSearch() {
    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    setState({ kind: 'searching' });

    try {
      const result = await listKkiruCustomers({ ...EMPTY_LIST_QUERY, q: trimmed });
      setState({
        items: result.items,
        kind: 'done',
        query: trimmed,
        total: result.pagination.total,
      });
    } catch {
      setState({ kind: 'error' });
    }
  }

  return (
    <Modal
      description="이름이나 전화번호로 찾고, 목록에서 고객을 누르면 선택됩니다."
      isOpen={isOpen}
      onClose={onClose}
      title="고객 찾기"
      widthClassName="w-[min(36rem,calc(100vw-2rem))]"
    >
      <div className="flex flex-col gap-5">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Icon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--muted)]/70"
              name="search"
            />
            <input
              aria-label="이름 또는 전화번호"
              data-autofocus
              className={`${INPUT_CLASS_NAME} pl-10`}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="예: 김민준, 0101234"
              type="search"
              value={query}
            />
          </div>
          <button
            className={`${PRIMARY_BUTTON_CLASS_NAME} h-11`}
            disabled={state.kind === 'searching' || !query.trim()}
            onClick={() => void handleSearch()}
            type="button"
          >
            찾기
          </button>
        </div>

        <SearchResults onAddInstead={onAddInstead} onPick={onPick} state={state} />
      </div>
    </Modal>
  );
}
