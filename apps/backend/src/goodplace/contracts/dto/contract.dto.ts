import { IsBoolean, IsIn, IsOptional, IsUUID, Matches, ValidateIf } from 'class-validator';
import {
  DateOnlyField,
  ManwonField,
  NotBeforeDateField,
  OptionalText,
  PhoneField,
  RequiredText,
} from '../../common/goodplace-fields';
import { ListQueryDto } from '../../common/list-query';

export const CONTRACT_STATUSES = ['contracting', 'completed', 'cancelled'] as const;

export const BALANCE_DUE_BEFORE_CONTRACT_MESSAGE = '잔금일은 계약 일자와 같거나 뒤여야 합니다.';

/** 계약 추가·수정에 공통으로 쓰는 항목. 금액은 만원. 상태는 버튼으로만 바뀐다. */
export class ContractFieldsDto {
  @DateOnlyField()
  contractedOn!: string;

  /** 임대인이 매물 의뢰인과 같으면 의뢰인 이름·연락처를 지금 값으로 복사한다. */
  @IsBoolean()
  landlordSameAsClient!: boolean;

  @ValidateIf((dto: ContractFieldsDto) => !dto.landlordSameAsClient)
  @RequiredText(100)
  landlordName?: string;

  @ValidateIf((dto: ContractFieldsDto) => !dto.landlordSameAsClient)
  @PhoneField()
  landlordPhone?: string;

  /** 실제 계약 금액 */
  @ManwonField()
  deposit!: number;

  @ManwonField()
  rent!: number;

  @ManwonField()
  premium!: number;

  @DateOnlyField()
  leaseStartOn!: string;

  @DateOnlyField()
  leaseEndOn!: string;

  @OptionalText(5000)
  specialTerms?: string | null;

  /** 계약금 */
  @ManwonField()
  downPayment!: number;

  /** 잔금. 화면에서는 보증금 − 계약금으로 미리 채우지만 서버는 받은 값을 그대로 저장한다. */
  @ManwonField()
  balance!: number;

  /** 잔금일 */
  @DateOnlyField()
  @NotBeforeDateField('contractedOn', BALANCE_DUE_BEFORE_CONTRACT_MESSAGE)
  balanceDueOn!: string;

  /** 수수료 */
  @ManwonField()
  commission!: number;

  @IsBoolean()
  isMyListing!: boolean;

  @IsBoolean()
  isMyClient!: boolean;
}

/** 계약 진행: 미팅에서 매물 하나를 골라 계약을 만든다. 미팅 매물에 없던 매물이면 함께 더한다. */
export class CreateContractDto extends ContractFieldsDto {
  /** 미팅의 케이스 번호 */
  @Matches(/^[0-9A-Za-z]{1,16}$/)
  meetingCode!: string;

  /** 대상 매물 */
  @IsUUID()
  listingId!: string;
}

export class UpdateContractDto extends ContractFieldsDto {}

export const CONTRACT_SEARCH_FIELDS = [
  'all',
  'caseCode',
  'customer',
  'listing',
  'landlord',
] as const;
export type ContractSearchField = (typeof CONTRACT_SEARCH_FIELDS)[number];
export const CONTRACT_SORT_FIELDS = [
  'contractedOn',
  'customer',
  'listing',
  'commission',
  'balance',
  'balanceDueOn',
  'status',
] as const;
export type ContractSortField = (typeof CONTRACT_SORT_FIELDS)[number];

export class ListContractsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(CONTRACT_STATUSES)
  status?: (typeof CONTRACT_STATUSES)[number];

  @IsOptional()
  @IsIn(CONTRACT_SEARCH_FIELDS)
  field?: ContractSearchField;

  @IsOptional()
  @IsIn(CONTRACT_SORT_FIELDS)
  sort?: ContractSortField;
}
