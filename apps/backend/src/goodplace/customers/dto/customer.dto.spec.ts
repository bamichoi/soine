import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CustomerDto } from './customer.dto';

function phoneErrors(phone: string) {
  const dto = plainToInstance(CustomerDto, { name: '김임차', phone });
  return validateSync(dto).filter((error) => error.property === 'phone');
}

describe('CustomerDto phone', () => {
  it('accepts 010 mobile numbers with or without hyphens', () => {
    expect(phoneErrors('010-1234-5678')).toHaveLength(0);
    expect(phoneErrors('01012345678')).toHaveLength(0);
  });

  it('rejects anything but 010 + 8 digits', () => {
    expect(phoneErrors('010-345-6849')).not.toHaveLength(0);
    expect(phoneErrors('02-1234-5678')).not.toHaveLength(0);
    expect(phoneErrors('011-1234-5678')).not.toHaveLength(0);
    expect(phoneErrors('010-1234-56789')).not.toHaveLength(0);
  });
});
