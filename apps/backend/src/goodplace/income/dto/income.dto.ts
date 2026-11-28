import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export const INCOME_YEAR_MIN = 2000;
export const INCOME_YEAR_MAX = 2100;

export const INCOME_MINE_FILTERS = ['listing', 'client'] as const;
export type IncomeMineFilter = (typeof INCOME_MINE_FILTERS)[number];

/** 수입 기간. year(연간) 또는 month(월별, YYYY-MM) 중 하나만 받는다. 둘 다 없으면 이번 달. */
export class IncomeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(INCOME_YEAR_MIN)
  @Max(INCOME_YEAR_MAX)
  year?: number;

  /** YYYY-MM (2000-01 ~ 2100-12) */
  @IsOptional()
  @Matches(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM (2000-2100)' })
  month?: string;

  /** 구분: listing = 내 매물 계약만, client = 내 손님 계약만. 없으면 전체 계약 */
  @IsOptional()
  @IsIn(INCOME_MINE_FILTERS)
  mine?: IncomeMineFilter;
}
