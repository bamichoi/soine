import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ContractFieldsDto, CreateContractDto, ListContractsQueryDto } from './contract.dto';

const FIELDS = {
  balance: 2700,
  balanceDueOn: '2026-12-01',
  commission: 300,
  contractedOn: '2026-11-25',
  deposit: 3000,
  downPayment: 300,
  isMyClient: true,
  isMyListing: false,
  landlordSameAsClient: true,
  leaseEndOn: '2028-11-30',
  leaseStartOn: '2026-12-01',
  premium: 4500,
  rent: 230,
};

function errorsOf(input: Record<string, unknown>) {
  return validateSync(plainToInstance(ContractFieldsDto, input));
}

function propertiesOf(input: Record<string, unknown>) {
  return errorsOf(input).map((error) => error.property);
}

describe('ContractFieldsDto balance', () => {
  it('accepts a balance and a balance due date on or after the contract date', () => {
    expect(errorsOf(FIELDS)).toHaveLength(0);
    expect(errorsOf({ ...FIELDS, balance: 0, balanceDueOn: FIELDS.contractedOn })).toHaveLength(0);
  });

  it('requires both the balance and the balance due date', () => {
    const { balance: _balance, balanceDueOn: _balanceDueOn, ...rest } = FIELDS;

    expect(propertiesOf(rest)).toEqual(expect.arrayContaining(['balance', 'balanceDueOn']));
    expect(propertiesOf({ ...FIELDS, balance: null, balanceDueOn: '' })).toEqual(
      expect.arrayContaining(['balance', 'balanceDueOn']),
    );
  });

  it('rejects a negative or fractional balance', () => {
    expect(propertiesOf({ ...FIELDS, balance: -1 })).toEqual(['balance']);
    expect(propertiesOf({ ...FIELDS, balance: 1.5 })).toEqual(['balance']);
  });

  it('rejects a balance due date before the contract date', () => {
    const errors = errorsOf({ ...FIELDS, balanceDueOn: '2026-11-24' });

    expect(errors.map((error) => error.property)).toEqual(['balanceDueOn']);
    expect(Object.values(errors[0].constraints ?? {})).toContain(
      '잔금일은 계약 일자와 같거나 뒤여야 합니다.',
    );
  });

  it('checks the balance due date on create too', () => {
    const dto = plainToInstance(CreateContractDto, {
      ...FIELDS,
      balanceDueOn: '2026-11-01',
      listingId: '7b0c9e6e-2f43-4a8e-9d43-6a7b1e4f1c2d',
      meetingCode: 'K7K3FQ9A',
    });

    expect(validateSync(dto).map((error) => error.property)).toEqual(['balanceDueOn']);
  });
});

describe('ListContractsQueryDto sort', () => {
  it.each(['balance', 'balanceDueOn'])('accepts sort=%s', (sort) => {
    expect(validateSync(plainToInstance(ListContractsQueryDto, { sort }))).toHaveLength(0);
  });
});
