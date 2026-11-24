'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import { InquiryStatusBadge } from '@/components/inquiry-status-badge';
import { Pagination } from '@/components/pagination';
import {
  formatInquiryDate,
  formatSeoulDateTime,
  getFirstLine,
  INQUIRY_SEARCH_FIELD_LABELS,
  INQUIRY_SEARCH_FIELDS,
  type InquiryListQuery,
  type InquiryListResponse,
  type InquirySearchField,
  type InquirySortField,
  listInquiries,
  parseInquiryListQuery,
  toInquiryListSearchParams,
} from '@/lib/choidolsang-inquiries-api';

const EMPTY_VALUE = <span className="text-[var(--muted)]">-</span>;

const CONTROL_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)]';
const BUTTON_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50';

// 처음 누르면 날짜는 최신순, 글자는 가나다순으로 정렬한다.
const DEFAULT_SORT_ORDERS: Record<InquirySortField, 'asc' | 'desc'> = {
  desiredConcept: 'asc',
  desiredReservationAt: 'desc',
  inquiredOn: 'desc',
  location: 'asc',
  status: 'asc',
};

type Column = {
  key: string;
  label: string;
  sortField?: InquirySortField;
  className?: string;
};

const COLUMNS: Column[] = [
  // 문의 번호는 순서가 없는 무작위 코드라 정렬하지 않는다.
  { className: 'w-28', key: 'code', label: '문의 번호' },
  { className: 'w-28', key: 'inquiredOn', label: '문의 날짜', sortField: 'inquiredOn' },
  { key: 'content', label: '문의 내용' },
  {
    className: 'w-40',
    key: 'desiredReservationAt',
    label: '희망 예약일시',
    sortField: 'desiredReservationAt',
  },
  { className: 'w-32', key: 'location', label: '장소', sortField: 'location' },
  {
    className: 'w-36',
    key: 'desiredConcept',
    label: '희망 돌상 컨셉',
    sortField: 'desiredConcept',
  },
  { className: 'w-24', key: 'status', label: '상태', sortField: 'status' },
];

const SORT_ICONS = { asc: 'arrow-up', desc: 'arrow-down' } as const;
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

type ColumnHeaderProps = {
  column: Column;
  /** 이 열로 정렬 중이면 정렬 방향, 아니면 null */
  order: 'asc' | 'desc' | null;
  onSort: (sortField: InquirySortField) => void;
};

function ColumnHeader({ column, order, onSort }: ColumnHeaderProps) {
  const { sortField } = column;

  return (
    <th
      aria-sort={order ? ARIA_SORT[order] : undefined}
      className={`px-4 py-3 font-medium whitespace-nowrap ${column.className ?? ''}`}
      scope="col"
    >
      {sortField ? (
        <button
          className="flex items-center gap-1 hover:text-[var(--foreground)]"
          onClick={() => onSort(sortField)}
          type="button"
        >
          {column.label}
          <Icon
            className={`size-3.5 ${order ? 'text-[var(--brand)]' : 'opacity-50'}`}
            name={order ? SORT_ICONS[order] : 'chevrons-up-down'}
          />
        </button>
      ) : (
        column.label
      )}
    </th>
  );
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: InquiryListResponse };

export function ChoidolsangInquiryTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(
    () => parseInquiryListQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const queryKey = toInquiryListSearchParams(query).toString();
  const [searchField, setSearchField] = useState<InquirySearchField>(query.field);
  const [searchText, setSearchText] = useState(query.q);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  // 뒤로 가기 등으로 URL이 바뀌면 검색창도 맞춘다.
  useEffect(() => {
    setSearchField(query.field);
    setSearchText(query.q);
  }, [query.field, query.q]);

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 조건을 다시 불러오기 위한 값이다.
    void reloadKey;
    listInquiries(parseInquiryListQuery(new URLSearchParams(queryKey)))
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
  }, [queryKey, reloadKey]);

  // 목록 조건은 URL에 남겨 상세에서 돌아와도 그대로 보이게 한다.
  function updateQuery(changes: Partial<InquiryListQuery>) {
    const params = toInquiryListSearchParams({ ...query, ...changes }).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ field: searchField, page: 1, q: searchText.trim() });
  }

  function handleSort(sortField: InquirySortField) {
    const order =
      query.sort === sortField
        ? query.order === 'asc'
          ? 'desc'
          : 'asc'
        : DEFAULT_SORT_ORDERS[sortField];
    updateQuery({ order, page: 1, sort: sortField });
  }

  const pagination = state.kind === 'loaded' ? state.data.pagination : null;
  const detailQuery = queryKey ? `?${queryKey}` : '';

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">문의 기록</h2>
          {pagination ? (
            <p className="text-sm text-[var(--muted)]">{pagination.total.toLocaleString()}건</p>
          ) : null}
        </div>
        <Link
          className="flex h-10 items-center gap-1.5 bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
          href={`/choidolsang/inquiries/new${detailQuery}`}
        >
          <Icon className="size-4" name="plus" />
          문의 추가
        </Link>
      </div>

      <form
        aria-label="문의 검색"
        className="flex flex-wrap items-center gap-2"
        onSubmit={handleSearch}
      >
        <div className="relative">
          <select
            aria-label="검색 항목"
            className={`${CONTROL_CLASS_NAME} w-40 appearance-none pr-9`}
            onChange={(event) => setSearchField(event.target.value as InquirySearchField)}
            value={searchField}
          >
            {INQUIRY_SEARCH_FIELDS.map((field) => (
              <option key={field} value={field}>
                {INQUIRY_SEARCH_FIELD_LABELS[field]}
              </option>
            ))}
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
          placeholder="검색어 입력"
          type="search"
          value={searchText}
        />
        <button className={BUTTON_CLASS_NAME} type="submit">
          검색
        </button>
        {query.q ? (
          <button
            className="h-10 px-2 text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            onClick={() => updateQuery({ field: 'all', page: 1, q: '' })}
            type="button"
          >
            검색 초기화
          </button>
        ) : null}
      </form>

      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[56rem] table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              {COLUMNS.map((column) => (
                <ColumnHeader
                  column={column}
                  key={column.key}
                  onSort={handleSort}
                  order={column.sortField === query.sort ? query.order : null}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((inquiry) => (
                  // 행 전체를 누르면 상세로 간다. 문의 번호 링크를 행 크기로 늘려서
                  // 키보드 이동, 새 탭 열기 같은 링크 동작을 그대로 쓴다.
                  <tr
                    className="relative cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--background)] has-[a:focus-visible]:bg-[var(--brand-soft)]"
                    key={inquiry.id}
                  >
                    <td className="px-4 py-3">
                      <Link
                        aria-label={`문의 ${inquiry.code} 상세 보기`}
                        className="font-mono text-[13px] tracking-wide outline-none after:absolute after:inset-0"
                        href={`/choidolsang/inquiries/${inquiry.code}${detailQuery}`}
                      >
                        {inquiry.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatInquiryDate(inquiry.inquiredOn)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate" title={inquiry.content}>
                        {getFirstLine(inquiry.content)}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {inquiry.desiredReservationAt
                        ? formatSeoulDateTime(inquiry.desiredReservationAt)
                        : EMPTY_VALUE}
                    </td>
                    <td className="px-4 py-3">
                      {inquiry.location ? (
                        <p className="truncate" title={inquiry.location}>
                          {inquiry.location}
                        </p>
                      ) : (
                        EMPTY_VALUE
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inquiry.desiredConcept ? (
                        <p className="truncate" title={inquiry.desiredConcept.name}>
                          {inquiry.desiredConcept.name}
                          {inquiry.desiredConcept.isDeleted ? (
                            <span className="text-[var(--muted)]"> (삭제됨)</span>
                          ) : null}
                        </p>
                      ) : (
                        EMPTY_VALUE
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <InquiryStatusBadge status={inquiry.status} />
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        {state.kind === 'loading' ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            문의를 불러오고 있습니다.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10" role="alert">
            <p className="text-sm text-[var(--error)]">문의를 불러오지 못했습니다.</p>
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
            {query.q ? '검색 결과가 없습니다.' : '아직 등록된 문의가 없습니다.'}
          </p>
        ) : null}
      </div>

      {pagination ? (
        <Pagination
          label="문의 기록 페이지"
          onChange={(page) => updateQuery({ page })}
          page={pagination.page}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
