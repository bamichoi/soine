import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** 검색 대상 항목. all은 검색 가능한 모든 항목에서 찾는다. */
export const INQUIRY_SEARCH_FIELDS = [
  'all',
  'code',
  'content',
  'location',
  'desiredConcept',
  'status',
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

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ListInquiriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  page?: number;

  @IsOptional()
  @IsIn(INQUIRY_SEARCH_FIELDS)
  field?: InquirySearchField;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(INQUIRY_SORT_FIELDS)
  sort?: InquirySortField;

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}
