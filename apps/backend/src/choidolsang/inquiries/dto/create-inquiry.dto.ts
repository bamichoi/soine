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

export class CreateInquiryDto {
  /** 문의 날짜 (YYYY-MM-DD) */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  inquiredOn!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(INQUIRY_CONTENT_MAX_LENGTH)
  content!: string;

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
