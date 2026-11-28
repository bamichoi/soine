import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { DateTimeField, RequiredText } from '../../common/kkiru-fields';
import { ListQueryDto } from '../../common/list-query';
import { LOG_CONTENT_MAX_LENGTH } from '../../common/log-record.dto';

export const MEETING_STATUSES = [
  'meeting',
  'contracting',
  'contracted',
  'contract_cancelled',
  'stopped',
] as const;

/** 미팅 진행: 상담에서 매물 하나를 두고 미팅을 만든다. 미팅 내용은 로그의 첫 기록이 된다. */
export class CreateMeetingDto {
  /** 상담의 케이스 번호 */
  @Matches(/^[0-9A-Za-z]{1,16}$/)
  consultationCode!: string;

  @IsUUID()
  listingId!: string;

  @DateTimeField()
  meetAt!: string;

  @RequiredText(LOG_CONTENT_MAX_LENGTH)
  content!: string;
}

/** 미팅 수정. 대상 매물은 계약이 없을 때만 바꿀 수 있다. 상태는 버튼으로만 바뀐다. */
export class UpdateMeetingDto {
  @IsUUID()
  listingId!: string;

  @DateTimeField()
  meetAt!: string;
}

export const MEETING_SEARCH_FIELDS = [
  'all',
  'caseCode',
  'customer',
  'listing',
  'consultationTitle',
] as const;
export type MeetingSearchField = (typeof MEETING_SEARCH_FIELDS)[number];
export const MEETING_SORT_FIELDS = [
  'meetAt',
  'customer',
  'listing',
  'consultationTitle',
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
