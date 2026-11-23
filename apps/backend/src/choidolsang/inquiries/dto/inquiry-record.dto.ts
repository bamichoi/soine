import { DateOnlyField, InquiryContentField } from './create-inquiry.dto';

/** 문의 내용 로그의 기록 추가·수정 */
export class InquiryRecordDto {
  /** 기록 날짜 (YYYY-MM-DD) */
  @DateOnlyField()
  recordedOn!: string;

  @InquiryContentField()
  content!: string;
}
