import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CONCEPT_NAME_MAX_LENGTH = 100;
/** 구성품 항목 수와 항목 하나의 길이 */
export const CONCEPT_COMPONENTS_MAX_COUNT = 50;
export const CONCEPT_COMPONENT_MAX_LENGTH = 200;
export const CONCEPT_PRICE_MAX = 100_000_000;

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

// 구성품은 앞뒤 공백을 지우고 빈 항목은 뺀다. 문자열이 아닌 값은 검증에서 걸러지도록 그대로 둔다.
export function cleanStringList({ value }: { value: unknown }) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '');
}

/** 돌상 컨셉 추가·수정. 수정할 때도 모든 항목을 다시 보낸다. */
export class ConceptDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONCEPT_NAME_MAX_LENGTH)
  name!: string;

  /** 구성품 목록. 화면에서 하나씩 추가한 순서대로 저장한다. */
  @IsOptional()
  @Transform(cleanStringList)
  @IsArray()
  @ArrayMaxSize(CONCEPT_COMPONENTS_MAX_COUNT)
  @IsString({ each: true })
  @MaxLength(CONCEPT_COMPONENT_MAX_LENGTH, { each: true })
  components?: string[];

  /** 가격 (원) */
  @IsInt()
  @Min(0)
  @Max(CONCEPT_PRICE_MAX)
  price!: number;
}

export const CONCEPT_SEARCH_FIELDS = ['all', 'name', 'components'] as const;
export type ConceptSearchField = (typeof CONCEPT_SEARCH_FIELDS)[number];
export const CONCEPT_SORT_FIELDS = ['name', 'price', 'createdAt'] as const;
export type ConceptSortField = (typeof CONCEPT_SORT_FIELDS)[number];
export const CONCEPT_SORT_ORDERS = ['asc', 'desc'] as const;

export class ListConceptsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** 검색어 (부분 일치) */
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  q?: string;

  /** 검색 항목. all이면 이름과 구성품에서 모두 찾는다. */
  @IsOptional()
  @IsIn(CONCEPT_SEARCH_FIELDS)
  field?: ConceptSearchField;

  @IsOptional()
  @IsIn(CONCEPT_SORT_FIELDS)
  sort?: ConceptSortField;

  @IsOptional()
  @IsIn(CONCEPT_SORT_ORDERS)
  order?: (typeof CONCEPT_SORT_ORDERS)[number];
}
