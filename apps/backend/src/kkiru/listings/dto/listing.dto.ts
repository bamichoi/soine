import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ManwonField, OptionalText, PhoneField, RequiredText } from '../../common/kkiru-fields';
import { ListQueryDto } from '../../common/list-query';

/** 매물 추가·수정. 상태는 계약에 따라 바뀌므로 여기서 받지 않는다. */
export class ListingDto {
  @RequiredText(100)
  name!: string;

  @RequiredText(300)
  address!: string;

  /** 면적(㎡, 소수 둘째 자리까지) */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  areaM2!: number;

  @RequiredText(50)
  floor!: string;

  /** 임대료(만원) */
  @ManwonField()
  rent!: number;

  /** 보증금(만원) */
  @ManwonField()
  deposit!: number;

  /** 권리금(만원) */
  @ManwonField()
  premium!: number;

  @IsOptional()
  @IsBoolean()
  hasParking?: boolean | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  restroomCount?: number | null;

  @OptionalText(5000)
  features?: string | null;

  @RequiredText(100)
  clientName!: string;

  @PhoneField()
  clientPhone!: string;
}

export const LISTING_STATUSES = ['available', 'meeting', 'contracting', 'contracted'] as const;

export const LISTING_SEARCH_FIELDS = ['all', 'code', 'name', 'address', 'client'] as const;
export type ListingSearchField = (typeof LISTING_SEARCH_FIELDS)[number];
export const LISTING_SORT_FIELDS = [
  'name',
  'address',
  'areaM2',
  'floor',
  'deposit',
  'premium',
  'status',
  'createdAt',
] as const;
export type ListingSortField = (typeof LISTING_SORT_FIELDS)[number];

export class ListListingsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(LISTING_STATUSES)
  status?: (typeof LISTING_STATUSES)[number];

  @IsOptional()
  @IsIn(LISTING_SEARCH_FIELDS)
  field?: ListingSearchField;

  @IsOptional()
  @IsIn(LISTING_SORT_FIELDS)
  sort?: ListingSortField;
}

/** 매물 고르기(미팅 매물·계약 대상)용 검색 */
export class ListingOptionsQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
