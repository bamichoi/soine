// 목록 한 페이지 개수 (docs/adr/ADR-0011-백오피스-다크-모드와-표-개수.md).
// 초이돌상·굿플레이스 목록이 같은 쿼리 이름(size)과 허용 값을 쓴다. 최대 100.

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** size를 보내지 않으면 쓰는 개수 */
export const DEFAULT_PAGE_SIZE: PageSize = 20;

export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export function toPagination(page: number, pageSize: number, total: number): Pagination {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
