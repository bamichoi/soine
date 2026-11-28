import { IsOptional, IsUUID } from 'class-validator';
import { DateOnlyField, RequiredText } from './kkiru-fields';

export const LOG_CONTENT_MAX_LENGTH = 5000;

/** 미팅 로그 기록 추가·수정 */
export class LogRecordDto {
  @DateOnlyField()
  recordedOn!: string;

  @RequiredText(LOG_CONTENT_MAX_LENGTH)
  content!: string;

  /**
   * 관련 매물(선택). 그 미팅의 미팅 매물이어야 한다.
   * 수정할 때 null이면 연결을 끊고, 보내지 않으면 그대로 둔다.
   */
  @IsOptional()
  @IsUUID()
  listingId?: string | null;
}

/** 미팅 중단·재개, 계약 취소 사유 */
export class ReasonDto {
  @RequiredText(LOG_CONTENT_MAX_LENGTH)
  reason!: string;
}
