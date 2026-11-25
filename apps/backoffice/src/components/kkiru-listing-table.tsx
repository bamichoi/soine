'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { CopyCodeButton } from '@/components/copy-code-button';
import { Icon } from '@/components/icon';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { Pagination } from '@/components/pagination';
import { formatArea, formatManwon } from '@/lib/kkiru-format';
import { type KkiruListingListResponse, listKkiruListings } from '@/lib/kkiru-listings-api';
import { type KkiruListingStatus, LISTING_STATUS_LABELS } from '@/lib/kkiru-status';

const LIST_PATH = '/kkiru/listings';

const CONTROL_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)]';
const BUTTON_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: KkiruListingListResponse };

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseStatus(value: string | null): KkiruListingStatus | null {
  return value === 'available' || value === 'contracted' ? value : null;
}

export function KkiruListingTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const q = (searchParams.get('q') ?? '').trim();
  const status = parseStatus(searchParams.get('status'));
  const [searchText, setSearchText] = useState(q);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    setSearchText(q);
  }, [q]);

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });
    void reloadKey;

    listKkiruListings(page, q, status)
      .then((data) => {
        if (isActive) {
          setState({ data, kind: 'loaded' });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, [page, q, status, reloadKey]);

  function updateQuery(next: { page?: number; q?: string; status?: KkiruListingStatus | null }) {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextStatus = next.status === undefined ? status : next.status;
    const nextPage = next.page ?? page;

    if (nextQ) {
      params.set('q', nextQ);
    }

    if (nextStatus) {
      params.set('status', nextStatus);
    }

    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ page: 1, q: searchText.trim() });
  }

  const pagination = state.kind === 'loaded' ? state.data.pagination : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">매물</h2>
          {pagination ? (
            <p className="text-sm text-[var(--muted)]">{pagination.total.toLocaleString()}건</p>
          ) : null}
        </div>
        <Link
          className="flex h-10 items-center gap-1.5 bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
          href={`${LIST_PATH}/new`}
        >
          <Icon className="size-4" name="plus" />
          매물 추가
        </Link>
      </div>

      <form
        aria-label="매물 검색"
        className="flex flex-wrap items-center gap-2"
        onSubmit={handleSearch}
      >
        <div className="relative">
          <select
            aria-label="상태"
            className={`${CONTROL_CLASS_NAME} w-32 appearance-none pr-9`}
            onChange={(event) => updateQuery({ page: 1, status: parseStatus(event.target.value) })}
            value={status ?? ''}
          >
            <option value="">전체 상태</option>
            <option value="available">{LISTING_STATUS_LABELS.available}</option>
            <option value="contracted">{LISTING_STATUS_LABELS.contracted}</option>
          </select>
          <Icon
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--muted)]"
            name="chevron-down"
          />
        </div>
        <input
          aria-label="검색어"
          className={`${CONTROL_CLASS_NAME} min-w-0 flex-1 sm:max-w-80`}
          maxLength={100}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="매물 번호, 이름, 주소"
          type="search"
          value={searchText}
        />
        <button className={BUTTON_CLASS_NAME} type="submit">
          검색
        </button>
        {q || status ? (
          <button
            className="h-10 px-2 text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            onClick={() => updateQuery({ page: 1, q: '', status: null })}
            type="button"
          >
            검색 초기화
          </button>
        ) : null}
      </form>

      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[76rem] table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="w-36 px-4 py-3 font-medium" scope="col">
                매물 번호
              </th>
              <th className="w-44 px-4 py-3 font-medium" scope="col">
                매물 이름
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                주소
              </th>
              <th className="w-40 px-4 py-3 font-medium" scope="col">
                면적
              </th>
              <th className="w-20 px-4 py-3 font-medium" scope="col">
                층
              </th>
              <th className="w-40 px-4 py-3 text-right font-medium" scope="col">
                보증금 / 임대료
              </th>
              <th className="w-28 px-4 py-3 text-right font-medium" scope="col">
                권리금
              </th>
              <th className="w-24 px-4 py-3 font-medium" scope="col">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((listing) => (
                  <tr
                    className="relative cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--background)] has-[a:focus-visible]:bg-[var(--brand-soft)]"
                    key={listing.id}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <Link
                          aria-label={`매물 ${listing.name} 상세 보기`}
                          className="font-mono text-[13px] tracking-wide outline-none after:absolute after:inset-0"
                          href={`${LIST_PATH}/${listing.code}`}
                        >
                          {listing.code}
                        </Link>
                        <CopyCodeButton code={listing.code} label="매물 번호" />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate" title={listing.name}>
                        {listing.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate" title={listing.address}>
                        {listing.address}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatArea(listing.areaM2)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{listing.floor}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {listing.deposit.toLocaleString('ko-KR')} / {formatManwon(listing.rent)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatManwon(listing.premium)}
                    </td>
                    <td className="px-4 py-3">
                      <KkiruStatusBadge
                        label={LISTING_STATUS_LABELS[listing.status]}
                        status={listing.status}
                      />
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        {state.kind === 'loading' ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            매물을 불러오고 있습니다.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10" role="alert">
            <p className="text-sm text-[var(--error)]">매물을 불러오지 못했습니다.</p>
            <button
              className={BUTTON_CLASS_NAME}
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : null}
        {state.kind === 'loaded' && state.data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            {q || status ? '검색 결과가 없습니다.' : '아직 등록된 매물이 없습니다.'}
          </p>
        ) : null}
      </div>

      {pagination ? (
        <Pagination
          label="매물 페이지"
          onChange={(nextPage) => updateQuery({ page: nextPage })}
          page={pagination.page}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
