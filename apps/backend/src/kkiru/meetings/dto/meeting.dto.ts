import { IsIn, IsNumber, IsOptional, IsUUID, Matches, Max, Min, ValidateIf } from 'class-validator';
import { DateTimeField, ManwonField, RequiredText } from '../../common/kkiru-fields';
import { ListQueryDto } from '../../common/list-query';
import { LOG_CONTENT_MAX_LENGTH } from '../../common/log-record.dto';

export const INFLOW_SOURCES = ['naver_land', 'instagram', 'other'] as const;
export const MEETING_STATUSES = [
  'meeting',
  'contracting',
  'contracted',
  'contract_cancelled',
  'stopped',
] as const;

/** 미팅 추가·수정에 공통으로 쓰는 항목. 상태는 계약·중단으로만 바뀌므로 받지 않는다. */
export class MeetingFieldsDto {
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
  @ValidateIf((dto: MeetingFieldsDto) => dto.inflowSource === 'other')
  @RequiredText(100)
  inflowSourceDetail?: string | null;

  /** 미팅 일시 (시간대 포함) */
  @DateTimeField()
  meetAt!: string;
}

/** 미팅 추가. 고객은 고객 번호로 고르고, 미팅 내용은 로그의 첫 기록이 된다. */
export class CreateMeetingDto extends MeetingFieldsDto {
  @Matches(/^[0-9A-Za-z]{1,16}$/)
  customerCode!: string;

  @RequiredText(LOG_CONTENT_MAX_LENGTH)
  content!: string;
}

export class UpdateMeetingDto extends MeetingFieldsDto {}

export const MEETING_SEARCH_FIELDS = [
  'all',
  'code',
  'title',
  'customer',
  'phone',
  'interestArea',
  'desiredBusiness',
] as const;
export type MeetingSearchField = (typeof MEETING_SEARCH_FIELDS)[number];
export const MEETING_SORT_FIELDS = [
  'meetAt',
  'title',
  'customer',
  'interestArea',
  'desiredBusiness',
  'status',
] as const;
export type MeetingSortField = (typeof MEETING_SORT_FIELDS)[number];

export class ListMeetingsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(MEETING_STATUSES)
  status?: (typeof MEETING_STATUSES)[number];

  @IsOptional()
  @IsIn(MEETING_SEARCH_FIELDS)
  field?: MeetingSearchField;

  @IsOptional()
  @IsIn(MEETING_SORT_FIELDS)
  sort?: MeetingSortField;
}

export class AddMeetingListingDto {
  @IsUUID()
  listingId!: string;
}
