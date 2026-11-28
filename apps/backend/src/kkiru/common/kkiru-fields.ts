import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

/** 비어 있는 선택 항목은 null로 저장한다. */
export function trimToNull({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** 필수 글 항목 (앞뒤 공백 제거) */
export function RequiredText(maxLength: number) {
  return applyDecorators(Transform(trimString), IsString(), IsNotEmpty(), MaxLength(maxLength));
}

/** 선택 글 항목 (비우면 null) */
export function OptionalText(maxLength: number) {
  return applyDecorators(IsOptional(), Transform(trimToNull), IsString(), MaxLength(maxLength));
}

/** 국내 연락처. 하이픈·공백은 지우고 숫자만 받는다 (예: 01012345678) */
export function PhoneField() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.replace(/[\s-]/g, '') : value,
    ),
    IsString(),
    // 끼루 연락처는 휴대폰 번호만 받는다: 010 + 8자리 (010-0000-0000)
    Matches(/^010\d{8}$/, { message: 'phone must be a mobile number like 010-1234-5678' }),
  );
}

/** 날짜만 받는 항목 (YYYY-MM-DD) */
export function DateOnlyField() {
  return applyDecorators(Matches(/^\d{4}-\d{2}-\d{2}$/), IsISO8601({ strict: true }));
}

/** 시간대가 있는 일시 (ISO 8601) */
export function DateTimeField() {
  return applyDecorators(
    IsISO8601({ strict: true }),
    Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'must include a time zone' }),
  );
}

export const AMOUNT_MAX_MANWON = 10_000_000;

/** 금액(만원, 0 이상 정수) */
export function ManwonField() {
  return applyDecorators(IsInt(), Min(0), Max(AMOUNT_MAX_MANWON));
}

/** 목록 페이지 번호 */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** 검색어 */
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  q?: string;
}

/** DATE 컬럼은 UTC 자정으로 읽히므로 날짜 부분만 쓴다. */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 날짜만 저장하는 DATE 컬럼은 UTC 자정으로 넣는다. */
export function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export const KKIRU_PAGE_SIZE = 20;

export function toPagination(page: number, total: number) {
  return {
    page,
    pageSize: KKIRU_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / KKIRU_PAGE_SIZE)),
  };
}
