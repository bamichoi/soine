import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { REJECTION_REASON_MAX_LENGTH } from './reject-inquiry.dto';

// 취소(cancelled)는 연결된 예약이 취소될 때만 바뀌므로 문의를 추가할 때는 고를 수 없다.
export const INQUIRY_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export type InquiryStatusValue = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_CONTENT_MAX_LENGTH = 5000;
export const INQUIRY_SHORT_TEXT_MAX_LENGTH = 200;

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

// 비어 있는 선택 항목은 null로 저장한다.
function trimToNull({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** 날짜만 받는 항목 (YYYY-MM-DD) */
export function DateOnlyField() {
  return applyDecorators(Matches(/^\d{4}-\d{2}-\d{2}$/), IsISO8601({ strict: true }));
}

/** 문의·기록 내용 (필수, 앞뒤 공백 제거) */
export function InquiryContentField() {
  return applyDecorators(
    Transform(trimString),
    IsString(),
    IsNotEmpty(),
    MaxLength(INQUIRY_CONTENT_MAX_LENGTH),
  );
}

/** 문의 추가·수정에 공통으로 쓰는 선택 항목. 문의 날짜·내용은 로그에서 따로 고친다. */
export class InquiryOptionalFieldsDto {
  /** 희망 예약 일시 (시간대 포함 ISO 8601) */
  @IsOptional()
  @Transform(trimToNull)
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'desiredReservationAt must include a time zone' })
  desiredReservationAt?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(INQUIRY_SHORT_TEXT_MAX_LENGTH)
  location?: string | null;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(INQUIRY_SHORT_TEXT_MAX_LENGTH)
  desiredConcept?: string | null;
}

export class CreateInquiryDto extends InquiryOptionalFieldsDto {
  /** 문의 날짜 (YYYY-MM-DD) */
  @DateOnlyField()
  inquiredOn!: string;

  @InquiryContentField()
  content!: string;

  @IsOptional()
  @IsIn(INQUIRY_STATUSES)
  status?: InquiryStatusValue;

  /** 거절 사유. 상태가 거절이면 필수, 아니면 무시한다. */
  @ValidateIf((dto: CreateInquiryDto) => dto.status === 'rejected')
  @Transform(trimToNull)
  @IsString()
  @IsNotEmpty()
  @MaxLength(REJECTION_REASON_MAX_LENGTH)
  rejectionReason?: string | null;
}
