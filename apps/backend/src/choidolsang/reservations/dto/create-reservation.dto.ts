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
import { PAGE_SIZES, type PageSize } from '../../../common/page-size';
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

/** 예약 추가·수정에 공통으로 쓰는 항목. 수정할 때도 모두 다시 보낸다. 금액은 원 단위 정수다. */
export class ReservationFieldsDto {
  /** 예약자 성함 */
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName!: string;

  /** 예약자 연락처. 하이픈·공백은 지우고 숫자만 받는다 (예: 01012345678) */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '') : value,
  )
  @IsString()
  // 휴대폰 번호만 받는다: 010 + 8자리 (010-0000-0000)
  @Matches(/^010\d{8}$/, { message: 'customerPhone must be a mobile number like 010-1234-5678' })
  customerPhone!: string;

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

  /** 아기 이름 */
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  babyName!: string;

  /** 아기 성별 */
  @IsIn(BABY_GENDERS)
  babyGender!: (typeof BABY_GENDERS)[number];

  /** 돌상 컨셉 ID */
  @IsUUID()
  conceptId!: string;

  /** 참석 인원 */
  @IsInt()
  @Min(1)
  @Max(10_000)
  guestCount!: number;

  /** 스냅 촬영 포함 여부 */
  @IsBoolean()
  hasSnap!: boolean;

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

/** 문의에서 예약을 만든다. */
export class CreateReservationDto extends ReservationFieldsDto {
  /** 예약을 만들 문의의 문의 번호 */
  @Transform(trimString)
  @IsString()
  @Matches(/^[0-9A-Za-z]{1,16}$/)
  inquiryCode!: string;
}

/** 예약중인 예약을 고친다. 문의는 바꿀 수 없다. */
export class UpdateReservationDto extends ReservationFieldsDto {}

/** 검색 항목. all은 모든 항목에서 찾는다. */
export const RESERVATION_SEARCH_FIELDS = [
  'all',
  'code',
  'customerName',
  'customerPhone',
  'babyName',
  'concept',
  'eventLocation',
] as const;
export type ReservationSearchField = (typeof RESERVATION_SEARCH_FIELDS)[number];
export const RESERVATION_SORT_FIELDS = [
  'eventAt',
  'customerName',
  'babyName',
  'concept',
  'totalAmount',
  'status',
] as const;
export type ReservationSortField = (typeof RESERVATION_SORT_FIELDS)[number];
export const RESERVATION_FILTER_STATUSES = ['reserved', 'completed', 'cancelled'] as const;
export const RESERVATION_SORT_ORDERS = ['asc', 'desc'] as const;
export type ReservationSortOrder = (typeof RESERVATION_SORT_ORDERS)[number];

export class ListReservationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** 한 페이지 개수. 10·20·50·100 중 하나, 없으면 20 */
  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES)
  size?: PageSize;

  @IsOptional()
  @IsIn(RESERVATION_SEARCH_FIELDS)
  field?: ReservationSearchField;

  /** 검색어 (부분 일치) */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  /** 상태 필터. 검색어와 따로 고른다. */
  @IsOptional()
  @IsIn(RESERVATION_FILTER_STATUSES)
  status?: (typeof RESERVATION_FILTER_STATUSES)[number];

  @IsOptional()
  @IsIn(RESERVATION_SORT_FIELDS)
  sort?: ReservationSortField;

  @IsOptional()
  @IsIn(RESERVATION_SORT_ORDERS)
  order?: ReservationSortOrder;
}

/** 달력에 표시할 기간. 한국 날짜 기준이며 to는 포함하지 않는다. */
export class ReservationCalendarQueryDto {
  /** 시작 날짜 (YYYY-MM-DD, 포함) */
  @DateOnlyField()
  from!: string;

  /** 끝 날짜 (YYYY-MM-DD, 미포함) */
  @DateOnlyField()
  to!: string;
}
