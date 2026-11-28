import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PAGE_SIZES, type PageSize } from '../../../common/page-size';

/** 검색 대상 항목. all은 검색 가능한 모든 항목에서 찾는다. */
export const INQUIRY_SEARCH_FIELDS = [
  'all',
  'code',
  'content',
  'location',
  'desiredConcept',
] as const;
export type InquirySearchField = (typeof INQUIRY_SEARCH_FIELDS)[number];

export const INQUIRY_SORT_FIELDS = [
  'inquiredOn',
  'desiredReservationAt',
  'location',
  'desiredConcept',
  'status',
] as const;
export type InquirySortField = (typeof INQUIRY_SORT_FIELDS)[number];

/** 상태 필터. 검색어와 따로 고른다. */
export const INQUIRY_FILTER_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled'] as const;
export type InquiryFilterStatus = (typeof INQUIRY_FILTER_STATUSES)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ListInquiriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  page?: number;

  /** 한 페이지 개수. 10·20·50·100 중 하나, 없으면 20 */
  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES)
  size?: PageSize;

  @IsOptional()
  @IsIn(INQUIRY_SEARCH_FIELDS)
  field?: InquirySearchField;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(INQUIRY_FILTER_STATUSES)
  status?: InquiryFilterStatus;

  @IsOptional()
  @IsIn(INQUIRY_SORT_FIELDS)
  sort?: InquirySortField;

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}
