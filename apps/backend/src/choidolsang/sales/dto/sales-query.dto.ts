import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min, ValidateIf } from 'class-validator';

/**
 * 매출 조회 기간. month(YYYY-MM)나 year(YYYY) 중 하나를 보낸다.
 * 둘 다 있으면 month를 쓴다. 기간은 한국 날짜 기준이다.
 */
export class SalesPeriodQueryDto {
  @ValidateIf((dto: SalesPeriodQueryDto) => dto.year === undefined || dto.month !== undefined)
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' })
  month?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2999)
  year?: number;
}

export class SalesItemsQueryDto extends SalesPeriodQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
