import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { cleanStringList } from '../../concepts/dto/concept.dto';
import { DateOnlyField } from '../../inquiries/dto/create-inquiry.dto';

export const BABY_GENDERS = ['boy', 'girl'] as const;
export const RESERVATION_AMOUNT_MAX = 100_000_000;
export const DEFAULT_DEPOSIT_AMOUNT = 50_000;
export const EXTRA_COMPONENTS_MAX_COUNT = 50;
export const EXTRA_COMPONENT_MAX_LENGTH = 200;
export const RESERVATION_REQUESTS_MAX_LENGTH = 2000;

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

/** 문의에서 예약을 만든다. 금액은 원 단위 정수다. */
export class CreateReservationDto {
  /** 예약을 만들 문의의 문의 번호 */
  @Transform(trimString)
  @IsString()
  @Matches(/^[0-9A-Za-z]{1,16}$/)
  inquiryCode!: string;

  /** 예약자 성함 */
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName!: string;

  /** 행사 날짜·시간 (시간대 포함 ISO 8601) */
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'eventAt must include a time zone' })
  eventAt!: string;

  /** 행사 장소 */
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  eventLocation!: string;

  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  babyName?: string | null;

  @IsOptional()
  @IsIn(BABY_GENDERS)
  babyGender?: (typeof BABY_GENDERS)[number] | null;

  /** 돌상 컨셉 ID */
  @IsUUID()
  conceptId!: string;

  /** 참석 인원 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  guestCount?: number | null;

  /** 스냅 촬영 여부 */
  @IsOptional()
  @IsBoolean()
  hasSnap?: boolean;

  /** 추가 요청 사항 */
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(RESERVATION_REQUESTS_MAX_LENGTH)
  requests?: string | null;

  /** 추가 요청 구성품 목록 */
  @IsOptional()
  @Transform(cleanStringList)
  @IsArray()
  @ArrayMaxSize(EXTRA_COMPONENTS_MAX_COUNT)
  @IsString({ each: true })
  @MaxLength(EXTRA_COMPONENT_MAX_LENGTH, { each: true })
  extraComponents?: string[];

  /** 최종 결제 금액 (원) */
  @IsInt()
  @Min(0)
  @Max(RESERVATION_AMOUNT_MAX)
  totalAmount!: number;

  /** 예약금 (원). 보내지 않으면 50,000원 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(RESERVATION_AMOUNT_MAX)
  depositAmount?: number;

  /** 예약 확정 날짜 (YYYY-MM-DD) */
  @DateOnlyField()
  confirmedOn!: string;
}

export class ListReservationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
