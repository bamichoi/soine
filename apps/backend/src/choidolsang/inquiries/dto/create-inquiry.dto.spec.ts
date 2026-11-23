import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInquiryDto } from './create-inquiry.dto';

async function validateInput(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateInquiryDto, input);
  const errors = await validate(dto, { forbidNonWhitelisted: true, whitelist: true });
  return { dto, properties: errors.map((error) => error.property) };
}

describe('CreateInquiryDto', () => {
  it('accepts required fields only and trims empty optional fields to null', async () => {
    const { dto, properties } = await validateInput({
      content: '  가격 문의드립니다.  ',
      desiredConcept: '   ',
      inquiredOn: '2026-11-23',
      location: '',
    });

    expect(properties).toEqual([]);
    expect(dto.content).toBe('가격 문의드립니다.');
    expect(dto.location).toBeNull();
    expect(dto.desiredConcept).toBeNull();
  });

  it('requires the inquiry date and content', async () => {
    const { properties } = await validateInput({ content: '   ' });

    expect(properties).toEqual(expect.arrayContaining(['inquiredOn', 'content']));
  });

  it('rejects an invalid date', async () => {
    const { properties } = await validateInput({ content: '문의', inquiredOn: '2026-02-30' });

    expect(properties).toContain('inquiredOn');
  });

  it('requires a time zone on the desired reservation time', async () => {
    const withoutZone = await validateInput({
      content: '문의',
      desiredReservationAt: '2026-12-05T11:00',
      inquiredOn: '2026-11-23',
    });
    const withZone = await validateInput({
      content: '문의',
      desiredReservationAt: '2026-12-05T11:00:00+09:00',
      inquiredOn: '2026-11-23',
    });

    expect(withoutZone.properties).toContain('desiredReservationAt');
    expect(withZone.properties).toEqual([]);
  });

  it('rejects an unknown status', async () => {
    const { properties } = await validateInput({
      content: '문의',
      inquiredOn: '2026-11-23',
      status: 'done',
    });

    expect(properties).toContain('status');
  });
});

describe('CreateInquiryDto rejection reason', () => {
  it('requires a reason when created as rejected', async () => {
    const withoutReason = await validateInput({
      content: '문의',
      inquiredOn: '2026-11-23',
      rejectionReason: '  ',
      status: 'rejected',
    });
    const withReason = await validateInput({
      content: '문의',
      inquiredOn: '2026-11-23',
      rejectionReason: '일정 불가',
      status: 'rejected',
    });

    expect(withoutReason.properties).toContain('rejectionReason');
    expect(withReason.properties).toEqual([]);
  });
});
