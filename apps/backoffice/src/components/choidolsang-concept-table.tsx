'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  type ListColumn,
  ListFilterBar,
  type ListLoadState,
  ListView,
} from '@/components/list-table';
import {
  CONCEPT_SEARCH_FIELD_LABELS,
  CONCEPT_SEARCH_FIELDS,
  type Concept,
  type ConceptListQuery,
  type ConceptSearchField,
  type ConceptSortField,
  formatPrice,
  listConcepts,
  parseConceptListQuery,
  toConceptListSearchParams,
} from '@/lib/choidolsang-concepts-api';
import { nextSortOrder } from '@/lib/sort-order';
import { EMPTY_VALUE } from '@/lib/ui';

const LIST_PATH = '/choidolsang/concepts';

const COLUMNS: ListColumn<Concept>[] = [
  // 첫 열(이름)은 rowLink가 그린다.
  { className: 'w-56', key: 'name', label: '이름', render: () => null, sortField: 'name' },
  {
    key: 'components',
    label: '구성품',
    render: (concept) =>
      concept.components.length > 0 ? (
        <p className="truncate" title={concept.components.join(', ')}>
          {concept.components.join(', ')}
        </p>
      ) : (
        EMPTY_VALUE
      ),
  },
  {
    align: 'right',
    className: 'w-36',
    firstOrder: 'desc',
    key: 'price',
    label: '가격',
    render: (concept) => <span className="font-bold">{formatPrice(concept.price)}</span>,
    sortField: 'price',
  },
];

// '전체 항목'은 필터 바가 맨 앞에 붙인다.
const SEARCH_OPTIONS = CONCEPT_SEARCH_FIELDS.filter((field) => field !== 'all').map((field) => ({
  label: CONCEPT_SEARCH_FIELD_LABELS[field],
  value: field,
}));

export function ChoidolsangConceptTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(
    () => parseConceptListQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const queryKey = toConceptListSearchParams(query).toString();
  const [searchText, setSearchText] = useState(query.q);
  const [searchField, setSearchField] = useState<ConceptSearchField>(query.field);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<ListLoadState<Concept>>({ kind: 'loading' });

  // 뒤로 가기 등으로 URL이 바뀌면 검색창도 맞춘다.
  useEffect(() => {
    setSearchText(query.q);
    setSearchField(query.field);
  }, [query.q, query.field]);

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 조건을 다시 불러오기 위한 값이다.
    void reloadKey;
    listConcepts(parseConceptListQuery(new URLSearchParams(queryKey)))
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
  function updateQuery(changes: Partial<ConceptListQuery>) {
    const params = toConceptListSearchParams({ ...query, ...changes }).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ field: searchField, page: 1, q: searchText.trim() });
  }

  // 처음 누르면 이름은 가나다순, 가격은 높은 순으로 정렬한다 (열의 firstOrder).
  function handleSort(column: ListColumn<Concept>) {
    const sort = column.sortField as ConceptSortField;
    updateQuery({ order: nextSortOrder(query, sort, column.firstOrder ?? 'asc'), page: 1, sort });
  }

  const detailQuery = queryKey ? `?${queryKey}` : '';

  return (
    <ListView
      activeOrder={query.order}
      activeSort={query.sort}
      addLink={{ href: `${LIST_PATH}/new${detailQuery}`, label: '컨셉 추가' }}
      columns={COLUMNS}
      emptyText="아직 등록된 돌상 컨셉이 없습니다."
      filterBar={
        <ListFilterBar
          hasFilter={Boolean(query.q)}
          onReset={() => updateQuery({ field: 'all', page: 1, q: '' })}
          onSearchFieldChange={(field) => setSearchField(field as ConceptSearchField)}
          onSearchTextChange={setSearchText}
          onSubmit={handleSearch}
          searchField={searchField}
          searchFields={SEARCH_OPTIONS}
          searchText={searchText}
          status={null}
          title="돌상 컨셉"
        />
      }
      fixedLayout
      hasFilter={Boolean(query.q)}
      listQuery={detailQuery}
      minWidth="40rem"
      onPage={(page) => updateQuery({ page })}
      onPageSize={(size) => updateQuery({ page: 1, size })}
      onRetry={() => setReloadKey((key) => key + 1)}
      onSort={handleSort}
      pageSize={query.size}
      rowLink={(concept, listQuery) => ({
        href: `${LIST_PATH}/${concept.id}${listQuery}`,
        isName: true,
        label: `돌상 컨셉 ${concept.name} 상세 보기`,
        text: concept.name,
      })}
      state={state}
      title="돌상 컨셉"
      unit="개"
    />
  );
}
