import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const REJECTION_REASON_MAX_LENGTH = 1000;

export class RejectInquiryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(REJECTION_REASON_MAX_LENGTH)
  reason!: string;
}
