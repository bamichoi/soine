import { IsIn, IsOptional } from 'class-validator';
import { OptionalText, PhoneField, RequiredText } from '../../common/kkiru-fields';
import { ListQueryDto } from '../../common/list-query';

export const CUSTOMER_SEARCH_FIELDS = ['all', 'name', 'phone', 'code'] as const;
export type CustomerSearchField = (typeof CUSTOMER_SEARCH_FIELDS)[number];
export const CUSTOMER_SORT_FIELDS = ['name', 'phone', 'meetingCount', 'createdAt'] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export class ListCustomersQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(CUSTOMER_SEARCH_FIELDS)
  field?: CustomerSearchField;

  @IsOptional()
  @IsIn(CUSTOMER_SORT_FIELDS)
  sort?: CustomerSortField;
}

/** 고객 추가·수정 */
export class CustomerDto {
  @RequiredText(100)
  name!: string;

  /** 연락처. 다른 고객과 겹칠 수 없다. */
  @PhoneField()
  phone!: string;

  /** 고객 메모 (선택) */
  @OptionalText(5000)
  memo?: string | null;
}

export class CustomerLookupQueryDto {
  @PhoneField()
  phone!: string;
}
