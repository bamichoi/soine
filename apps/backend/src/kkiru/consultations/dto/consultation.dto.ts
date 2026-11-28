import { IsIn, IsNumber, IsOptional, IsUUID, Matches, Max, Min, ValidateIf } from 'class-validator';
import { DateOnlyField, ManwonField, RequiredText } from '../../common/kkiru-fields';
import { ListQueryDto } from '../../common/list-query';
import { LOG_CONTENT_MAX_LENGTH } from '../../common/log-record.dto';

export const INFLOW_SOURCES = ['naver_land', 'instagram', 'other'] as const;
export const CONSULTATION_STATUSES = [
  'consulting',
  'meeting',
  'contracting',
  'contracted',
  'contract_cancelled',
] as const;

/** 상담 추가·수정에 공통으로 쓰는 항목. 상태는 버튼으로만 바뀌므로 받지 않는다. */
export class ConsultationFieldsDto {
  @RequiredText(100)
  title!: string;

  @RequiredText(200)
  interestArea!: string;

  @RequiredText(200)
  desiredBusiness!: string;

  /** 희망 평수 범위(평) */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  desiredPyeongMin!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  desiredPyeongMax!: number;

  @RequiredText(50)
  desiredFloor!: string;

  @ManwonField()
  desiredRent!: number;

  @ManwonField()
  maxDeposit!: number;

  @ManwonField()
  maxPremium!: number;

  @IsIn(INFLOW_SOURCES)
  inflowSource!: (typeof INFLOW_SOURCES)[number];

  /** 유입 경로가 기타일 때 필수 */
  @ValidateIf((dto: ConsultationFieldsDto) => dto.inflowSource === 'other')
  @RequiredText(100)
  inflowSourceDetail?: string | null;

  @DateOnlyField()
  consultedOn!: string;
}

/** 상담 추가. 고객은 고객 번호로 고르고, 상담 내용은 로그의 첫 기록이 된다. */
export class CreateConsultationDto extends ConsultationFieldsDto {
  @Matches(/^[0-9A-Za-z]{1,16}$/)
  customerCode!: string;

  @RequiredText(LOG_CONTENT_MAX_LENGTH)
  content!: string;
}

export class UpdateConsultationDto extends ConsultationFieldsDto {}

export const CONSULTATION_SEARCH_FIELDS = [
  'all',
  'code',
  'title',
  'customer',
  'phone',
  'interestArea',
  'desiredBusiness',
] as const;
export type ConsultationSearchField = (typeof CONSULTATION_SEARCH_FIELDS)[number];
export const CONSULTATION_SORT_FIELDS = [
  'consultedOn',
  'title',
  'customer',
  'interestArea',
  'desiredBusiness',
  'status',
] as const;
export type ConsultationSortField = (typeof CONSULTATION_SORT_FIELDS)[number];

export class ListConsultationsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(CONSULTATION_STATUSES)
  status?: (typeof CONSULTATION_STATUSES)[number];

  @IsOptional()
  @IsIn(CONSULTATION_SEARCH_FIELDS)
  field?: ConsultationSearchField;

  @IsOptional()
  @IsIn(CONSULTATION_SORT_FIELDS)
  sort?: ConsultationSortField;
}

export class AddConsultationListingDto {
  @IsUUID()
  listingId!: string;
}
