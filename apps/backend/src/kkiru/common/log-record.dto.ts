import { DateOnlyField, RequiredText } from './kkiru-fields';

export const LOG_CONTENT_MAX_LENGTH = 5000;

/** 상담·미팅 로그 기록 추가·수정 */
export class LogRecordDto {
  @DateOnlyField()
  recordedOn!: string;

  @RequiredText(LOG_CONTENT_MAX_LENGTH)
  content!: string;
}

/** 미팅 중단·재개, 계약 취소 사유 */
export class ReasonDto {
  @RequiredText(LOG_CONTENT_MAX_LENGTH)
  reason!: string;
}
