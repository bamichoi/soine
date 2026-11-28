export type SortOrder = 'asc' | 'desc';

/** 같은 열이면 방향을 뒤집고, 다른 열이면 그 열의 첫 방향으로 정렬한다. */
export function nextSortOrder(
  current: { sort: string; order: SortOrder },
  field: string,
  firstOrder: SortOrder,
): SortOrder {
  if (current.sort !== field) {
    return firstOrder;
  }

  return current.order === 'asc' ? 'desc' : 'asc';
}
