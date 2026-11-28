'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { KkiruChip, KkiruNotice, KkiruPageHead } from '@/components/kkiru-parts';
import { Pagination } from '@/components/pagination';
import {
  FOCUS_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SMALL_BUTTON_CLASS_NAME,
  TEXT_BUTTON_CLASS_NAME,
} from '@/lib/kkiru-ui';
import { type ListQuery, type Paginated, toListParams } from '@/lib/list-query';

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
  rowLink: (
    item: T,
    listQuery: string,
  ) => { href: string; label: string; text: string; extra?: ReactNode };
  load: (query: ListQuery) => Promise<Paginated<T>>;
  emptyText: string;
  minWidth: string;
  addLink?: { href: string; label: string };
  /**
   * 'kkiru'면 끼루 모양(docs/design/kkiru-style-guide.md '표'·'필터 바').
   * 기본 'default'는 지금 모양 그대로다. 기능(검색·정렬·상태 필터·페이지·주소 쿼리)은 같다.
   */
  look?: 'default' | 'kkiru';
};

type LoadState<T> =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: Paginated<T> };

const CONTROL_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)]';
const BUTTON_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]';
const SORT_ICONS = { asc: 'arrow-up', desc: 'arrow-down' } as const;
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function ListRow<T>({
  columns,
  item,
  link,
}: {
  columns: ListColumn<T>[];
  item: T;
  link: { href: string; label: string; text: string; extra?: ReactNode };
}) {
  return (
    <tr className="relative cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--background)] has-[a:focus-visible]:bg-[var(--brand-soft)]">
      {columns.map((column, index) => (
        <td
          className={`px-4 py-3 ${column.align === 'right' ? 'text-right whitespace-nowrap tabular-nums' : ''}`}
          key={column.key}
        >
          {index === 0 ? (
            <span className="flex items-center gap-1">
              <Link
                aria-label={link.label}
                className="font-mono text-[13px] tracking-wide whitespace-nowrap outline-none after:absolute after:inset-0"
                href={link.href}
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
  /** 이 열로 정렬 중이면 정렬 방향, 아니면 null */
  order: SortOrder | null;
  onSort: (column: ListColumn<T>) => void;
}) {
  const isRight = column.align === 'right';

  return (
    <th
      aria-sort={order ? ARIA_SORT[order] : undefined}
      className={`px-4 py-3 font-medium whitespace-nowrap ${isRight ? 'text-right' : ''} ${column.className ?? ''}`}
      scope="col"
    >
      {column.sortField ? (
        <button
          className={`inline-flex items-center gap-1 hover:text-[var(--foreground)] ${isRight ? 'flex-row-reverse' : ''}`}
          onClick={() => onSort(column)}
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

function TableMessage<T>({
  state,
  hasFilter,
  title,
  emptyText,
  onRetry,
}: {
  state: LoadState<T>;
  hasFilter: boolean;
  title: string;
  emptyText: string;
  onRetry: () => void;
}) {
  if (state.kind === 'loading') {
    return <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">불러오고 있습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10" role="alert">
        <p className="text-sm text-[var(--error)]">{title}을(를) 불러오지 못했습니다.</p>
        <button className={BUTTON_CLASS_NAME} onClick={onRetry} type="button">
          다시 시도
        </button>
      </div>
    );
  }

  return state.data.items.length === 0 ? (
    <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
      {hasFilter ? '검색 결과가 없습니다.' : emptyText}
    </p>
  ) : null;
}

function SelectBox({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: ListOption[];
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        className={`${CONTROL_CLASS_NAME} ${className} appearance-none pr-9`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--muted)]"
        name="chevron-down"
      />
    </div>
  );
}

// ---------------------------------------------------------------- 끼루 모양

type RowLink = { href: string; label: string; text: string; extra?: ReactNode };

function KkiruListRow<T>({
  columns,
  item,
  link,
}: {
  columns: ListColumn<T>[];
  item: T;
  link: RowLink;
}) {
  return (
    <tr className="relative cursor-pointer border-b border-[var(--line)]/40 last:border-b-0 hover:bg-[var(--background)]/60 has-[a:focus-visible]:bg-[var(--brand-soft)]">
      {columns.map((column, index) => (
        <td
          className={`px-5 py-3.5 ${column.align === 'right' ? 'text-right whitespace-nowrap tabular-nums' : ''}`}
          key={column.key}
        >
          {index === 0 ? (
            <span className="flex items-center gap-1">
              <Link
                aria-label={link.label}
                className="font-mono text-[13px] tracking-wide whitespace-nowrap text-[var(--muted)] outline-none after:absolute after:inset-0"
                href={link.href}
                translate="no"
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

function KkiruColumnHeader<T>({
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
function KkiruTableMessage<T>({
  state,
  hasFilter,
  title,
  emptyText,
  onRetry,
}: {
  state: LoadState<T>;
  hasFilter: boolean;
  title: string;
  emptyText: string;
  onRetry: () => void;
}) {
  if (state.kind === 'loading') {
    return <KkiruNotice text="불러오고 있습니다." />;
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
    <KkiruNotice text={hasFilter ? '검색 결과가 없습니다.' : emptyText} />
  ) : null;
}

type KkiruFilterBarProps = {
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
  onStatusChange: (status: string | null) => void;
  onReset: () => void;
};

/** 왼쪽 검색 묶음, 오른쪽 상태 칩. 모바일은 두 줄 */
function KkiruFilterBar({
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
}: KkiruFilterBarProps) {
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
          <KkiruChip onClick={() => onStatusChange(null)} pressed={status === null}>
            전체
          </KkiruChip>
          {statusOptions.map((option) => (
            <KkiruChip
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              pressed={status === option.value}
            >
              {option.label}
            </KkiruChip>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}

type KkiruListViewProps<T extends { id: string }> = Pick<
  ListTableProps<T>,
  'title' | 'unit' | 'columns' | 'rowLink' | 'emptyText' | 'minWidth' | 'addLink'
> & {
  state: LoadState<T>;
  activeSort: string;
  activeOrder: SortOrder;
  hasFilter: boolean;
  listQuery: string;
  filterBar: ReactNode;
  onSort: (column: ListColumn<T>) => void;
  onRetry: () => void;
  onPage: (page: number) => void;
};

/** 끼루 모양 목록: 제목 줄 → 필터 바 → 표 카드 → 페이지 */
function KkiruListView<T extends { id: string }>({
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
}: KkiruListViewProps<T>) {
  const pagination = state.kind === 'loaded' ? state.data.pagination : null;

  return (
    <section>
      <KkiruPageHead
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
      </KkiruPageHead>

      {filterBar}

      {/* 표는 카드 안에서만 가로로 밀린다. */}
      <div className="overflow-x-auto rounded-[18px] bg-[var(--surface)]">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="border-b border-[var(--line)]/60 text-[var(--muted)]">
            <tr>
              {columns.map((column) => (
                <KkiruColumnHeader
                  column={column}
                  key={column.key}
                  onSort={onSort}
                  order={column.sortField === activeSort ? activeOrder : null}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((item) => (
                  <KkiruListRow
                    columns={columns}
                    item={item}
                    key={item.id}
                    link={rowLink(item, listQuery)}
                  />
                ))
              : null}
          </tbody>
        </table>
        <KkiruTableMessage
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
            look="kkiru"
            onChange={onPage}
            page={pagination.page}
            totalPages={pagination.totalPages}
          />
        </div>
      ) : null}
    </section>
  );
}

function parsePage(value: string | null): number {
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
    page: parsePage(params.get('page')),
    q: (params.get('q') ?? '').trim().slice(0, 100),
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
  look = 'default',
}: ListTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = parseListQuery(searchParams, { columns, searchFields, statusOptions });
  const queryKey = toListParams(query);
  const [searchText, setSearchText] = useState(query.q);
  const [searchField, setSearchField] = useState(query.field);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState<T>>({ kind: 'loading' });

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
  const pagination = state.kind === 'loaded' ? state.data.pagination : null;
  const hasFilter = Boolean(query.q || query.status);
  const retry = () => setReloadKey((key) => key + 1);

  if (look === 'kkiru') {
    return (
      <KkiruListView
        activeOrder={activeOrder}
        activeSort={activeSort}
        addLink={addLink}
        columns={columns}
        emptyText={emptyText}
        filterBar={
          <KkiruFilterBar
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
        onRetry={retry}
        onSort={handleSort}
        rowLink={rowLink}
        state={state}
        title={title}
        unit={unit}
      />
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          {pagination ? (
            <p className="text-sm text-[var(--muted)]">
              {pagination.total.toLocaleString()}
              {unit}
            </p>
          ) : null}
        </div>
        {addLink ? (
          <Link
            className="flex h-10 items-center gap-1.5 bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
            href={addLink.href}
          >
            <Icon className="size-4" name="plus" />
            {addLink.label}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <form
          aria-label={`${title} 검색`}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          onSubmit={handleSearch}
        >
          <SelectBox
            className="w-36"
            label="검색 항목"
            onChange={setSearchField}
            options={[{ label: '전체 항목', value: 'all' }, ...searchFields]}
            value={searchField}
          />
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
          {hasFilter ? (
            <button
              className="h-10 px-2 text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
              onClick={() => updateQuery({ field: 'all', page: 1, q: '', status: null })}
              type="button"
            >
              검색 초기화
            </button>
          ) : null}
        </form>
        {/* 상태 열이 표 오른쪽 끝에 있으므로 상태 필터도 오른쪽 끝에 둔다. */}
        {statusOptions ? (
          <div className="ml-auto">
            <SelectBox
              className="w-32"
              label="상태 필터"
              onChange={(value) => updateQuery({ page: 1, status: value || null })}
              options={[{ label: '전체 상태', value: '' }, ...statusOptions]}
              value={query.status ?? ''}
            />
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        {/* 열 너비를 고정하지 않고 내용에 맞춰 남는 폭을 고루 나눈다. */}
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              {columns.map((column) => (
                <ColumnHeader
                  column={column}
                  key={column.key}
                  onSort={handleSort}
                  order={column.sortField === activeSort ? activeOrder : null}
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
                    link={rowLink(item, queryKey ? `?${queryKey}` : '')}
                  />
                ))
              : null}
          </tbody>
        </table>
        <TableMessage
          emptyText={emptyText}
          hasFilter={hasFilter}
          onRetry={retry}
          state={state}
          title={title}
        />
      </div>

      {pagination ? (
        <Pagination
          label={`${title} 페이지`}
          onChange={(nextPage) => updateQuery({ page: nextPage })}
          page={pagination.page}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
