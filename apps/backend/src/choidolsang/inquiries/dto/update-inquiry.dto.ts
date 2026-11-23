import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { InquiryOptionalFieldsDto } from './create-inquiry.dto';
import { REJECTION_REASON_MAX_LENGTH } from './reject-inquiry.dto';

/**
 * 문의 수정. 상태는 상태 전환 API로, 문의 날짜·내용은 로그(첫 문의 수정)에서 바꾼다.
 * 선택 항목을 모두 다시 보내며, 비운 항목은 null로 저장한다.
 */
export class UpdateInquiryDto extends InquiryOptionalFieldsDto {
  /** 거절 사유. 거절된 문의일 때만 반영하고, 보내면 비워 둘 수 없다. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(REJECTION_REASON_MAX_LENGTH)
  rejectionReason?: string;
}
