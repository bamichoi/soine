import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReservationDto } from './create-reservation.dto';

const VALID = {
  babyGender: 'girl',
  babyName: '서윤',
  conceptId: '11111111-1111-4111-8111-111111111111',
  confirmedOn: '2026-11-24',
  customerName: '김고객',
  customerPhone: '010-1234-5678',
  eventAt: '2026-12-05T11:00:00+09:00',
  eventLocation: '서울 강남구',
  guestCount: 12,
  hasSnap: true,
  inquiryCode: '7K3FQ9AM',
  totalAmount: 300000,
};

async function validateInput(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateReservationDto, input);
  const errors = await validate(dto, { forbidNonWhitelisted: true, whitelist: true });
  return errors.map((error) => error.property);
}

describe('CreateReservationDto', () => {
  it('accepts a complete reservation', async () => {
    await expect(validateInput(VALID)).resolves.toEqual([]);
  });

  it('requires the baby name, baby gender, guest count and snap choice', async () => {
    const { babyName, babyGender, guestCount, hasSnap, ...rest } = VALID;

    await expect(validateInput({ ...rest, babyName: '  ' })).resolves.toEqual(
      expect.arrayContaining(['babyName', 'babyGender', 'guestCount', 'hasSnap']),
    );
  });

  it('accepts a phone number with hyphens and stores digits only', () => {
    const dto = plainToInstance(CreateReservationDto, VALID);

    expect(dto.customerPhone).toBe('01012345678');
  });

  it('rejects a phone number that is not a Korean number', async () => {
    await expect(validateInput({ ...VALID, customerPhone: '12345' })).resolves.toContain(
      'customerPhone',
    );
    await expect(validateInput({ ...VALID, customerPhone: '010-abcd-5678' })).resolves.toContain(
      'customerPhone',
    );
  });

  it('rejects an unknown gender and a guest count below one', async () => {
    const properties = await validateInput({ ...VALID, babyGender: 'unknown', guestCount: 0 });

    expect(properties).toEqual(expect.arrayContaining(['babyGender', 'guestCount']));
  });
});
