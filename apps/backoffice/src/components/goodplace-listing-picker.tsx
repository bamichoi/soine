'use client';

import { useEffect, useState } from 'react';
import { GoodplaceStatusBadge } from '@/components/goodplace-status-badge';
import { formatArea, formatManwon } from '@/lib/goodplace-format';
import {
  type GoodplaceListingOption,
  searchGoodplaceListingOptions,
} from '@/lib/goodplace-listings-api';
import { type GoodplaceListingStatus, LISTING_STATUS_LABELS } from '@/lib/goodplace-status';
import { FAINT_CLASS_NAME, FOCUS_CLASS_NAME, INPUT_CLASS_NAME } from '@/lib/ui';

type GoodplaceListingPickerProps = {
  /** 고르기 쉬운 후보 (예: 미팅 매물) */
  suggestions?: GoodplaceListingOption[];
  selectedId?: string | null;
  onPick: (listing: GoodplaceListingOption) => void;
  /** 이미 고른 매물은 목록에서 흐리게 보인다. */
  excludeIds?: string[];
  /** 이 상태의 매물은 흐리게 보이고 고를 수 없다. 상태 이름을 함께 보여 준다. */
  disabledStatuses?: GoodplaceListingStatus[];
};

function ListingRow({
  listing,
  selected,
  disabled,
  statusLabel,
  onPick,
}: {
  listing: GoodplaceListingOption;
  selected: boolean;
  disabled: boolean;
  /** 고를 수 없는 까닭이 되는 매물 상태 */
  statusLabel: string | null;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        aria-pressed={selected}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
          selected ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--surface)]'
        } ${FOCUS_CLASS_NAME}`}
        disabled={disabled}
        onClick={onPick}
        type="button"
      >
        <span
          className={`hidden w-24 shrink-0 font-mono text-xs font-medium sm:block ${FAINT_CLASS_NAME}`}
          translate="no"
        >
          {listing.code}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-bold">{listing.name}</span>
          <span className="truncate text-xs text-[var(--muted)] tabular-nums">
            {listing.address} · {formatArea(listing.areaM2)} · {listing.floor} · 보증금{' '}
            {formatManwon(listing.deposit)} / 월 {formatManwon(listing.rent)}
          </span>
        </span>
        {statusLabel ? <GoodplaceStatusBadge label={statusLabel} status={listing.status} /> : null}
      </button>
    </li>
  );
}

// 매물을 번호·이름·주소로 찾아 고른다. 계약완료된 매물은 나오지 않는다.
export function GoodplaceListingPicker({
  suggestions = [],
  selectedId,
  onPick,
  excludeIds = [],
  disabledStatuses = [],
}: GoodplaceListingPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoodplaceListingOption[] | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults(null);
      return;
    }

    let isActive = true;
    const timer = setTimeout(() => {
      searchGoodplaceListingOptions(trimmed)
        .then((items) => {
          if (isActive) {
            setResults(items);
            setIsError(false);
          }
        })
        .catch(() => {
          if (isActive) {
            setIsError(true);
          }
        });
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query]);

  // 계약완료된 후보는 흐리게 보여 줄 때만 남긴다. 검색 결과에는 계약완료 매물이 나오지 않는다.
  const shown =
    results ??
    suggestions.filter(
      (listing) => listing.status !== 'contracted' || disabledStatuses.includes('contracted'),
    );

  return (
    <div className="flex flex-col gap-2">
      <input
        aria-label="매물 검색"
        className={INPUT_CLASS_NAME}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="매물 번호, 이름, 주소로 검색"
        type="search"
        value={query}
      />
      {results === null && suggestions.length > 0 ? (
        <p className="text-xs text-[var(--muted)]">미팅 매물에서 고르거나 검색해 주세요.</p>
      ) : null}
      {isError ? (
        <p className="text-xs text-[var(--error)]" role="alert">
          매물을 찾지 못했습니다. 다시 시도해 주세요.
        </p>
      ) : null}
      {shown.length > 0 ? (
        <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-xl bg-[var(--background)] p-1">
          {shown.map((listing) => {
            const isBlocked = disabledStatuses.includes(listing.status);

            return (
              <ListingRow
                disabled={isBlocked || excludeIds.includes(listing.id)}
                key={listing.id}
                listing={listing}
                onPick={() => onPick(listing)}
                selected={listing.id === selectedId}
                statusLabel={isBlocked ? LISTING_STATUS_LABELS[listing.status] : null}
              />
            );
          })}
        </ul>
      ) : null}
      {results !== null && results.length === 0 && !isError ? (
        <p className="text-xs text-[var(--muted)]">
          계약완료되지 않은 매물 중에 찾는 매물이 없습니다.
        </p>
      ) : null}
    </div>
  );
}
