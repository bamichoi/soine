'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { CopyCodeButton } from '@/components/copy-code-button';
import { Icon } from '@/components/icon';
import { Pagination } from '@/components/pagination';
import { formatInquiryDate } from '@/lib/choidolsang-inquiries-api';
import { type KkiruCustomerListResponse, listKkiruCustomers } from '@/lib/kkiru-customers-api';
import { formatPhone } from '@/lib/phone';

const LIST_PATH = '/kkiru/customers';

const CONTROL_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)]';
const BUTTON_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: KkiruCustomerListResponse };

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function KkiruCustomerTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const q = (searchParams.get('q') ?? '').trim();
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

    listKkiruCustomers(page, q)
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
  }, [page, q, reloadKey]);

  function updateQuery(next: { page?: number; q?: string }) {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextPage = next.page ?? page;

    if (nextQ) {
      params.set('q', nextQ);
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
          <h2 className="text-lg font-semibold">고객</h2>
          {pagination ? (
            <p className="text-sm text-[var(--muted)]">{pagination.total.toLocaleString()}명</p>
          ) : null}
        </div>
        <Link
          className="flex h-10 items-center gap-1.5 bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
          href={`${LIST_PATH}/new`}
        >
          <Icon className="size-4" name="plus" />
          고객 추가
        </Link>
      </div>

      <form
        aria-label="고객 검색"
        className="flex flex-wrap items-center gap-2"
        onSubmit={handleSearch}
      >
        <input
          aria-label="검색어"
          className={`${CONTROL_CLASS_NAME} min-w-0 flex-1 sm:max-w-80`}
          maxLength={100}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="이름, 연락처, 고객 번호"
          type="search"
          value={searchText}
        />
        <button className={BUTTON_CLASS_NAME} type="submit">
          검색
        </button>
        {q ? (
          <button
            className="h-10 px-2 text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            onClick={() => updateQuery({ page: 1, q: '' })}
            type="button"
          >
            검색 초기화
          </button>
        ) : null}
      </form>

      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[40rem] table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="w-36 px-4 py-3 font-medium" scope="col">
                고객 번호
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                이름
              </th>
              <th className="w-40 px-4 py-3 font-medium" scope="col">
                연락처
              </th>
              <th className="w-24 px-4 py-3 text-right font-medium" scope="col">
                상담
              </th>
              <th className="w-28 px-4 py-3 font-medium" scope="col">
                등록일
              </th>
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((customer) => (
                  <tr
                    className="relative cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--background)] has-[a:focus-visible]:bg-[var(--brand-soft)]"
                    key={customer.id}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <Link
                          aria-label={`고객 ${customer.name} 상세 보기`}
                          className="font-mono text-[13px] tracking-wide outline-none after:absolute after:inset-0"
                          href={`${LIST_PATH}/${customer.code}`}
                        >
                          {customer.code}
                        </Link>
                        <CopyCodeButton code={customer.code} label="고객 번호" />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{customer.name}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatPhone(customer.phone)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {customer.consultationCount}건
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatInquiryDate(customer.createdAt.slice(0, 10))}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        {state.kind === 'loading' ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            고객을 불러오고 있습니다.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10" role="alert">
            <p className="text-sm text-[var(--error)]">고객을 불러오지 못했습니다.</p>
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
            {q ? '검색 결과가 없습니다.' : '아직 등록된 고객이 없습니다.'}
          </p>
        ) : null}
      </div>

      {pagination ? (
        <Pagination
          label="고객 페이지"
          onChange={(nextPage) => updateQuery({ page: nextPage })}
          page={pagination.page}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
