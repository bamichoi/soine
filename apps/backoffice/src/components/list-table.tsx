'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { Chip, Notice, PageHead } from '@/components/page-parts';
import { Pagination } from '@/components/pagination';
import { type ListQuery, type Paginated, parsePageSize, toListParams } from '@/lib/list-query';
import {
  FOCUS_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SMALL_BUTTON_CLASS_NAME,
  TEXT_BUTTON_CLASS_NAME,
} from '@/lib/ui';

type SortOrder = 'asc' | 'desc';

export type ListColumn<T> = {
  key: string;
  label: string;
  className?: string;
  align?: 'right';
  /** 이 열로 정렬할 때 API에 보내는 값. 없으면 정렬하지 않는다. */
  sortField?: string;
  /** 처음 눌렀을 때 정렬 방향. 날짜·금액은 desc, 글자는 asc(기본) */
  firstOrder?: SortOrder;
  render: (item: T) => ReactNode;
};

export type ListOption = { value: string; label: string };

/** 첫 열 링크. 행 전체가 이 링크로 이동한다. */
export type RowLink = {
  href: string;
  label: string;
  text: string;
  extra?: ReactNode;
  /** 번호가 아니라 이름이면 true (고정폭·회색 대신 굵은 글자) */
  isName?: boolean;
};

type ListTableProps<T extends { id: string }> = {
  title: string;
  unit: string;
  /** 검색 항목. '전체 항목'은 자동으로 맨 앞에 붙는다. */
  searchFields: ListOption[];
  /** 상태 필터. 없으면 필터를 보이지 않는다. */
  statusOptions?: ListOption[];
  columns: ListColumn<T>[];
  /** 정렬을 고르지 않았을 때 API가 쓰는 기본 정렬. 머리글 표시에만 쓴다. */
  defaultSort: { field: string; order: SortOrder };
  /**
   * 첫 열(번호) 링크. 행 전체가 이 링크로 이동한다.
   * listQuery는 지금 목록 조건('?q=...' 또는 '')으로, 상세에서 목록으로 돌아올 때 쓸 수 있다.
   */
  rowLink: (item: T, listQuery: string) => RowLink;
  load: (query: ListQuery) => Promise<Paginated<T>>;
  emptyText: string;
  minWidth: string;
  addLink?: { href: string; label: string };
};

export type ListLoadState<T> =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: Paginated<T> };

const SORT_ICONS = { asc: 'arrow-up', desc: 'arrow-down' } as const;
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function ListRow<T>({ columns, item, link }: { columns: ListColumn<T>[]; item: T; link: RowLink }) {
  return (
    <tr className="relative cursor-pointer border-b border-[var(--line)]/40 last:border-b-0 hover:bg-[var(--background)]/60 has-[a:focus-visible]:bg-[var(--brand-soft)]">
      {columns.map((column, index) => (
        <td
          className={`px-5 py-3.5 ${column.align === 'right' ? 'text-right whitespace-nowrap tabular-nums' : ''}`}
          key={column.key}
        >
          {index === 0 ? (
            <span className="flex min-w-0 items-center gap-1">
              <Link
                aria-label={link.label}
                className={`outline-none after:absolute after:inset-0 ${
                  link.isName
                    ? 'block min-w-0 truncate font-semibold'
                    : 'font-mono text-[13px] tracking-wide whitespace-nowrap text-[var(--muted)]'
                }`}
                href={link.href}
                title={link.isName ? link.text : undefined}
                translate={link.isName ? undefined : 'no'}
              >
                {link.text}
              </Link>
              {link.extra}
            </span>
          ) : (
            column.render(item)
          )}
        </td>
      ))}
    </tr>
  );
}

function ColumnHeader<T>({
  column,
  order,
  onSort,
}: {
  column: ListColumn<T>;
  order: SortOrder | null;
  onSort: (column: ListColumn<T>) => void;
}) {
  const isRight = column.align === 'right';

  return (
    <th
      aria-sort={order ? ARIA_SORT[order] : undefined}
      className={`h-12 px-5 text-[13px] font-semibold whitespace-nowrap ${isRight ? 'text-right' : ''} ${column.className ?? ''}`}
      scope="col"
    >
      {column.sortField ? (
        <button
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md font-semibold hover:text-[var(--foreground)] ${isRight ? 'flex-row-reverse' : ''} ${order ? 'text-[var(--foreground)]' : ''} ${FOCUS_CLASS_NAME}`}
          onClick={() => onSort(column)}
          type="button"
        >
          {column.label}
          <Icon
            className={`size-3.5 ${order ? 'text-[var(--brand)]' : 'opacity-40'}`}
            name={order ? SORT_ICONS[order] : 'chevrons-up-down'}
          />
        </button>
      ) : (
        column.label
      )}
    </th>
  );
}

/** 표 카드 안의 불러오는 중·없음·오류 */
function TableMessage<T>({
  state,
  hasFilter,
  title,
  emptyText,
  onRetry,
}: {
  state: ListLoadState<T>;
  hasFilter: boolean;
  title: string;
  emptyText: string;
  onRetry: () => void;
}) {
  if (state.kind === 'loading') {
    return <Notice text="불러오고 있습니다." />;
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-10" role="alert">
        <p className="text-sm text-[var(--error)]">{title}을(를) 불러오지 못했습니다.</p>
        <button className={SMALL_BUTTON_CLASS_NAME} onClick={onRetry} type="button">
          다시 시도
        </button>
      </div>
    );
  }

  return state.data.items.length === 0 ? (
    <Notice text={hasFilter ? '검색 결과가 없습니다.' : emptyText} />
  ) : null;
}

type ListFilterBarProps = {
  title: string;
  searchFields: ListOption[];
  statusOptions?: ListOption[];
  searchField: string;
  searchText: string;
  status: string | null;
  hasFilter: boolean;
  onSearchFieldChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** 상태 칩을 눌렀을 때. statusOptions가 있을 때만 쓴다. */
  onStatusChange?: (status: string | null) => void;
  onReset: () => void;
};

/** 왼쪽 검색 묶음, 오른쪽 상태 칩. 모바일은 두 줄. searchFields 앞에 '전체 항목'이 붙는다. */
export function ListFilterBar({
  title,
  searchFields,
  statusOptions,
  searchField,
  searchText,
  status,
  hasFilter,
  onSearchFieldChange,
  onSearchTextChange,
  onSubmit,
  onStatusChange,
  onReset,
}: ListFilterBarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
        <form
          aria-label={`${title} 검색`}
          className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-[14px] bg-[var(--surface)] p-1 focus-within:outline-2 focus-within:outline-[var(--brand)] sm:max-w-[30rem]"
          onSubmit={onSubmit}
        >
          <div className="relative shrink-0">
            <select
              aria-label="검색 항목"
              className="h-9 cursor-pointer appearance-none rounded-[10px] bg-[var(--background)] pr-8 pl-3 text-sm font-semibold outline-none"
              onChange={(event) => onSearchFieldChange(event.target.value)}
              value={searchField}
            >
              {[{ label: '전체 항목', value: 'all' }, ...searchFields].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-[var(--muted)]"
              name="chevron-down"
            />
          </div>
          <Icon
            className="ml-2 hidden size-4 shrink-0 text-[var(--muted)]/70 sm:block"
            name="search"
          />
          <input
            aria-label="검색어"
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--muted)]/70"
            maxLength={100}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="검색어 입력"
            type="search"
            value={searchText}
          />
          <button
            className="h-9 shrink-0 cursor-pointer rounded-[10px] bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--surface)] outline-none transition hover:bg-[var(--foreground)]/85 active:translate-y-px"
            type="submit"
          >
            검색
          </button>
        </form>
        {hasFilter ? (
          <button className={`${TEXT_BUTTON_CLASS_NAME} text-sm`} onClick={onReset} type="button">
            검색 초기화
          </button>
        ) : null}
      </div>
      {/* 상태 열이 표 오른쪽 끝에 있으므로 상태 필터도 오른쪽 끝에 둔다. */}
      {statusOptions ? (
        <fieldset aria-label="상태" className="m-0 flex flex-wrap gap-2 border-0 p-0">
          <Chip onClick={() => onStatusChange?.(null)} pressed={status === null}>
            전체
          </Chip>
          {statusOptions.map((option) => (
            <Chip
              key={option.value}
              onClick={() => onStatusChange?.(option.value)}
              pressed={status === option.value}
            >
              {option.label}
            </Chip>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}

type ListViewProps<T extends { id: string }> = Pick<
  ListTableProps<T>,
  'title' | 'unit' | 'columns' | 'rowLink' | 'emptyText' | 'minWidth' | 'addLink'
> & {
  state: ListLoadState<T>;
  /** 정렬 중인 열의 sortField. 없으면 null */
  activeSort: string | null;
  activeOrder: SortOrder;
  hasFilter: boolean;
  listQuery: string;
  filterBar: ReactNode;
  onSort: (column: ListColumn<T>) => void;
  onRetry: () => void;
  onPage: (page: number) => void;
  /** 지금 한 페이지 개수(주소 값) */
  pageSize: number;
  /** 개수를 바꿨을 때. 1페이지로 돌아간다 */
  onPageSize: (size: number) => void;
  /** 열 폭을 머리글 className으로 고정한다 (긴 글은 칸 안에서 말줄임) */
  fixedLayout?: boolean;
};

/** 목록: 제목 줄 → 필터 바 → 표 카드 → 페이지 (docs/design/goodplace-style-guide.md '표'·'필터 바') */
export function ListView<T extends { id: string }>({
  title,
  unit,
  columns,
  rowLink,
  emptyText,
  minWidth,
  addLink,
  state,
  activeSort,
  activeOrder,
  hasFilter,
  listQuery,
  filterBar,
  onSort,
  onRetry,
  onPage,
  pageSize,
  onPageSize,
  fixedLayout = false,
}: ListViewProps<T>) {
  const pagination = state.kind === 'loaded' ? state.data.pagination : null;

  return (
    <section>
      <PageHead
        controlsClassName="flex items-center gap-2"
        count={pagination ? `${pagination.total.toLocaleString()}${unit}` : null}
        title={title}
      >
        {addLink ? (
          <Link className={PRIMARY_BUTTON_CLASS_NAME} href={addLink.href}>
            <Icon className="size-4" name="plus" />
            {addLink.label}
          </Link>
        ) : null}
      </PageHead>

      {filterBar}

      {/* 표는 카드 안에서만 가로로 밀린다. */}
      <div className="overflow-x-auto rounded-[18px] bg-[var(--surface)]">
        <table
          className={`w-full text-left text-sm ${fixedLayout ? 'table-fixed' : ''}`}
          style={{ minWidth }}
        >
          <thead className="border-b border-[var(--line)]/60 text-[var(--muted)]">
            <tr>
              {columns.map((column) => (
                <ColumnHeader
                  column={column}
                  key={column.key}
                  onSort={onSort}
                  order={
                    column.sortField !== undefined && column.sortField === activeSort
                      ? activeOrder
                      : null
                  }
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((item) => (
                  <ListRow
                    columns={columns}
                    item={item}
                    key={item.id}
                    link={rowLink(item, listQuery)}
                  />
                ))
              : null}
          </tbody>
        </table>
        <TableMessage
          emptyText={emptyText}
          hasFilter={hasFilter}
          onRetry={onRetry}
          state={state}
          title={title}
        />
      </div>

      {pagination ? (
        <div className="mt-4">
          <Pagination
            label={`${title} 페이지`}
            onChange={onPage}
            onPageSizeChange={onPageSize}
            page={pagination.page}
            pageSize={pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
          />
        </div>
      ) : null}
    </section>
  );
}

function parsePageNumber(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function pickAllowed(value: string | null, allowed: string[]): string | null {
  return value !== null && allowed.includes(value) ? value : null;
}

/** 주소의 쿼리를 읽는다. 허용하지 않는 값은 기본값으로 둔다. */
function parseListQuery<T>(
  params: URLSearchParams,
  {
    searchFields,
    statusOptions,
    columns,
  }: Pick<ListTableProps<{ id: string }>, 'searchFields' | 'statusOptions'> & {
    columns: ListColumn<T>[];
  },
): ListQuery {
  const sortFields = columns.flatMap((column) => (column.sortField ? [column.sortField] : []));
  const sort = pickAllowed(params.get('sort'), sortFields);
  const order = pickAllowed(params.get('order'), ['asc', 'desc']) as SortOrder | null;

  return {
    field:
      pickAllowed(
        params.get('field'),
        searchFields.map((option) => option.value),
      ) ?? 'all',
    order: sort ? order : null,
    page: parsePageNumber(params.get('page')),
    q: (params.get('q') ?? '').trim().slice(0, 100),
    size: parsePageSize(params.get('size')),
    sort: order ? sort : null,
    status: pickAllowed(
      params.get('status'),
      (statusOptions ?? []).map((option) => option.value),
    ),
  };
}

// 백오피스 공통 목록 표. 검색 항목·검색어·상태 필터·정렬·페이지는 주소에 남긴다.
export function ListTable<T extends { id: string }>({
  title,
  unit,
  searchFields,
  statusOptions,
  columns,
  defaultSort,
  rowLink,
  load,
  emptyText,
  minWidth,
  addLink,
}: ListTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = parseListQuery(searchParams, { columns, searchFields, statusOptions });
  const queryKey = toListParams(query);
  const [searchText, setSearchText] = useState(query.q);
  const [searchField, setSearchField] = useState(query.field);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<ListLoadState<T>>({ kind: 'loading' });

  useEffect(() => {
    setSearchText(query.q);
    setSearchField(query.field);
  }, [query.q, query.field]);

  // query는 매번 새 객체이므로, 같은 쿼리인지는 쿼리 문자열(queryKey)로 본다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: queryKey stands for query.
  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });
    void reloadKey;

    load(query)
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
  }, [load, queryKey, reloadKey]);

  function updateQuery(next: Partial<ListQuery>) {
    const params = toListParams({ ...query, ...next });
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ field: searchField, page: 1, q: searchText.trim() });
  }

  // 같은 열을 다시 누르면 방향을 바꾸고, 다른 열은 그 열의 첫 방향으로 정렬한다.
  function handleSort(column: ListColumn<T>) {
    const field = column.sortField as string;
    const current = query.sort ?? defaultSort.field;
    const currentOrder = query.order ?? defaultSort.order;
    const order: SortOrder =
      current === field ? (currentOrder === 'asc' ? 'desc' : 'asc') : (column.firstOrder ?? 'asc');
    updateQuery({ order, page: 1, sort: field });
  }

  const activeSort = query.sort ?? defaultSort.field;
  const activeOrder = query.order ?? defaultSort.order;
  const hasFilter = Boolean(query.q || query.status);
  const retry = () => setReloadKey((key) => key + 1);

  return (
    <ListView
      activeOrder={activeOrder}
      activeSort={activeSort}
      addLink={addLink}
      columns={columns}
      emptyText={emptyText}
      filterBar={
        <ListFilterBar
          hasFilter={hasFilter}
          onReset={() => updateQuery({ field: 'all', page: 1, q: '', status: null })}
          onSearchFieldChange={setSearchField}
          onSearchTextChange={setSearchText}
          onStatusChange={(status) => updateQuery({ page: 1, status })}
          onSubmit={handleSearch}
          searchField={searchField}
          searchFields={searchFields}
          searchText={searchText}
          status={query.status}
          statusOptions={statusOptions}
          title={title}
        />
      }
      hasFilter={hasFilter}
      listQuery={queryKey ? `?${queryKey}` : ''}
      minWidth={minWidth}
      onPage={(nextPage) => updateQuery({ page: nextPage })}
      onPageSize={(size) => updateQuery({ page: 1, size })}
      onRetry={retry}
      onSort={handleSort}
      pageSize={query.size}
      rowLink={rowLink}
      state={state}
      title={title}
      unit={unit}
    />
  );
}
