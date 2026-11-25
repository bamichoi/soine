import { PhoneField, RequiredText } from '../../common/kkiru-fields';

/** 고객 추가·수정 */
export class CustomerDto {
  @RequiredText(100)
  name!: string;

  /** 연락처. 다른 고객과 겹칠 수 없다. */
  @PhoneField()
  phone!: string;
}

export class CustomerLookupQueryDto {
  @PhoneField()
  phone!: string;
}
