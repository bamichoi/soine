/** 한 페이지 개수 고르기 (docs/design/backoffice-theme.md 4절). 브라우저에 기억하지 않고 주소에만 둔다. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** 주소의 size 값. 목록에 없는 값이면 기본 20 */
export function parsePageSize(value: string | null): number {
  const size = Number(value);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

/** 백오피스 목록 검색·필터·정렬·페이지. 주소와 API 쿼리에 같은 이름으로 쓴다. */
export type ListQuery = {
  page: number;
  /** 한 페이지 개수. 기본 20 */
  size: number;
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
  size: DEFAULT_PAGE_SIZE,
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

  if (query.size !== DEFAULT_PAGE_SIZE) {
    params.set('size', String(query.size));
  }

  return params.toString();
}

export function withListParams(path: string, query: ListQuery): string {
  const params = toListParams(query);
  return params ? `${path}?${params}` : path;
}
