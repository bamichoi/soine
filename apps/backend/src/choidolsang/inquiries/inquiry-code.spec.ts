import { generateInquiryCode, normalizeInquiryCode } from './inquiry-code';

describe('generateInquiryCode', () => {
  it('creates an 8-character code without confusing letters', () => {
    for (let index = 0; index < 200; index += 1) {
      expect(generateInquiryCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    }
  });

  it('does not repeat in a small sample', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateInquiryCode()));

    expect(codes.size).toBe(1000);
  });
});

describe('normalizeInquiryCode', () => {
  it('trims and upper-cases a code', () => {
    expect(normalizeInquiryCode(' 7k3fq9am ')).toBe('7K3FQ9AM');
  });

  it('rejects anything that is not letters or digits', () => {
    expect(normalizeInquiryCode('7K3F-Q9AM')).toBeNull();
    expect(normalizeInquiryCode('')).toBeNull();
  });
});
