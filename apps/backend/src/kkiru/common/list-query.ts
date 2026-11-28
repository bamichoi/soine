import { IsIn, IsOptional } from 'class-validator';
import { PageQueryDto } from './kkiru-fields';

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** 목록 검색·정렬 공통 쿼리. 검색 항목(field)과 정렬 열(sort)은 목록마다 허용 값을 따로 둔다. */
export class ListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}

/**
 * 검색 항목별 조건에서 고른 항목의 조건을 만든다. 'all'이면 쓸 수 있는 조건을 모두 OR로 묶는다.
 * 항목 조건이 null이면 그 검색어로는 그 항목을 찾을 수 없다는 뜻이다(예: 번호 형식이 아님).
 */
export function pickSearch<W extends object>(
  conditions: Record<string, W | null>,
  field: string,
): W {
  const picked =
    field === 'all'
      ? Object.values(conditions).filter((condition): condition is W => condition !== null)
      : [conditions[field] ?? null].filter((condition): condition is W => condition !== null);

  if (picked.length === 0) {
    // 맞는 행이 없도록 한다.
    return { id: { in: [] } } as unknown as W;
  }

  // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
  return (picked.length === 1 ? picked[0] : { OR: picked }) as W;
}
