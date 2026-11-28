'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { CopyCodeButton } from '@/components/copy-code-button';
import { InquiryStatusBadge } from '@/components/inquiry-status-badge';
import {
  type ListColumn,
  ListFilterBar,
  type ListLoadState,
  ListView,
} from '@/components/list-table';
import {
  formatInquiryDate,
  formatSeoulDateTime,
  getFirstLine,
  INQUIRY_SEARCH_FIELD_LABELS,
  INQUIRY_SEARCH_FIELDS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUSES,
  type Inquiry,
  type InquiryListQuery,
  type InquirySearchField,
  type InquirySortField,
  type InquiryStatus,
  listInquiries,
  parseInquiryListQuery,
  toInquiryListSearchParams,
} from '@/lib/choidolsang-inquiries-api';
import { EMPTY_VALUE } from '@/lib/ui';

// 처음 누르면 날짜는 최신순, 글자는 가나다순으로 정렬한다.
const DEFAULT_SORT_ORDERS: Record<InquirySortField, 'asc' | 'desc'> = {
  desiredConcept: 'asc',
  desiredReservationAt: 'desc',
  inquiredOn: 'desc',
  location: 'asc',
  status: 'asc',
};

const COLUMNS: ListColumn<Inquiry>[] = [
  // 문의 번호는 순서가 없는 무작위 코드라 정렬하지 않는다. 첫 열은 rowLink가 그린다.
  { className: 'w-40', key: 'code', label: '문의 번호', render: () => null },
  {
    className: 'w-28',
    key: 'inquiredOn',
    label: '문의 날짜',
    render: (inquiry) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatInquiryDate(inquiry.inquiredOn)}
      </span>
    ),
    sortField: 'inquiredOn',
  },
  {
    key: 'content',
    label: '문의 내용',
    render: (inquiry) => (
      <p className="truncate" title={inquiry.content}>
        {getFirstLine(inquiry.content)}
      </p>
    ),
  },
  {
    className: 'w-44',
    key: 'desiredReservationAt',
    label: '희망 예약일시',
    render: (inquiry) => (
      <span className="whitespace-nowrap tabular-nums">
        {inquiry.desiredReservationAt
          ? formatSeoulDateTime(inquiry.desiredReservationAt)
          : EMPTY_VALUE}
      </span>
    ),
    sortField: 'desiredReservationAt',
  },
  {
    className: 'w-32',
    key: 'location',
    label: '장소',
    render: (inquiry) =>
      inquiry.location ? (
        <p className="truncate" title={inquiry.location}>
          {inquiry.location}
        </p>
      ) : (
        EMPTY_VALUE
      ),
    sortField: 'location',
  },
  {
    className: 'w-40',
    key: 'desiredConcept',
    label: '희망 돌상 컨셉',
    render: (inquiry) =>
      inquiry.desiredConcept ? (
        <p className="truncate" title={inquiry.desiredConcept.name}>
          {inquiry.desiredConcept.name}
          {inquiry.desiredConcept.isDeleted ? (
            <span className="text-[var(--muted)]"> (삭제됨)</span>
          ) : null}
        </p>
      ) : (
        EMPTY_VALUE
      ),
    sortField: 'desiredConcept',
  },
  {
    className: 'w-28',
    key: 'status',
    label: '상태',
    render: (inquiry) => <InquiryStatusBadge status={inquiry.status} />,
    sortField: 'status',
  },
];

// '전체 항목'은 필터 바가 맨 앞에 붙인다.
const SEARCH_OPTIONS = INQUIRY_SEARCH_FIELDS.filter((field) => field !== 'all').map((field) => ({
  label: INQUIRY_SEARCH_FIELD_LABELS[field],
  value: field,
}));

const STATUS_OPTIONS = INQUIRY_STATUSES.map((status) => ({
  label: INQUIRY_STATUS_LABELS[status],
  value: status,
}));

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
  const [state, setState] = useState<ListLoadState<Inquiry>>({ kind: 'loading' });

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

  const detailQuery = queryKey ? `?${queryKey}` : '';
  const hasFilter = Boolean(query.q || query.status);

  return (
    <ListView
      activeOrder={query.order}
      activeSort={query.sort}
      addLink={{ href: `/choidolsang/inquiries/new${detailQuery}`, label: '문의 추가' }}
      columns={COLUMNS}
      emptyText="아직 등록된 문의가 없습니다."
      filterBar={
        <ListFilterBar
          hasFilter={hasFilter}
          onReset={() => updateQuery({ field: 'all', page: 1, q: '', status: '' })}
          onSearchFieldChange={(field) => setSearchField(field as InquirySearchField)}
          onSearchTextChange={setSearchText}
          onStatusChange={(status) =>
            updateQuery({ page: 1, status: (status ?? '') as InquiryStatus | '' })
          }
          onSubmit={handleSearch}
          searchField={searchField}
          searchFields={SEARCH_OPTIONS}
          searchText={searchText}
          status={query.status || null}
          statusOptions={STATUS_OPTIONS}
          title="문의"
        />
      }
      fixedLayout
      hasFilter={hasFilter}
      listQuery={detailQuery}
      minWidth="60rem"
      onPage={(page) => updateQuery({ page })}
      onPageSize={(size) => updateQuery({ page: 1, size })}
      onRetry={() => setReloadKey((key) => key + 1)}
      onSort={(column) => handleSort(column.sortField as InquirySortField)}
      pageSize={query.size}
      rowLink={(inquiry, listQuery) => ({
        extra: <CopyCodeButton code={inquiry.code} label="문의 번호" />,
        href: `/choidolsang/inquiries/${inquiry.code}${listQuery}`,
        label: `문의 ${inquiry.code} 상세 보기`,
        text: inquiry.code,
      })}
      state={state}
      title="문의 기록"
      unit="건"
    />
  );
}
