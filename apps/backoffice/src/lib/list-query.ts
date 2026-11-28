/** 백오피스 목록 검색·필터·정렬·페이지. 주소와 API 쿼리에 같은 이름으로 쓴다. */
export type ListQuery = {
  page: number;
  q: string;
  /** 검색 항목. 'all'이면 모든 항목에서 찾는다. */
  field: string;
  status: string | null;
  /** 정렬 열. null이면 목록 기본 정렬 */
  sort: string | null;
  order: 'asc' | 'desc' | null;
};

/** 목록 API 응답 */
export type Paginated<T> = {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export const EMPTY_LIST_QUERY: ListQuery = {
  field: 'all',
  order: null,
  page: 1,
  q: '',
  sort: null,
  status: null,
};

/** 기본값은 빼고 쿼리 문자열로 바꾼다. */
export function toListParams(query: ListQuery): string {
  const params = new URLSearchParams();

  if (query.q) {
    params.set('q', query.q);

    if (query.field !== 'all') {
      params.set('field', query.field);
    }
  }

  if (query.status) {
    params.set('status', query.status);
  }

  if (query.sort && query.order) {
    params.set('sort', query.sort);
    params.set('order', query.order);
  }

  if (query.page > 1) {
    params.set('page', String(query.page));
  }

  return params.toString();
}

export function withListParams(path: string, query: ListQuery): string {
  const params = toListParams(query);
  return params ? `${path}?${params}` : path;
}
