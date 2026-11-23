import { randomBytes } from 'node:crypto';

// Crockford Base32: 헷갈리는 글자(I, L, O, U)를 뺀 32자. 256이 32로 나누어떨어져 편향이 없다.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INQUIRY_CODE_LENGTH = 8;

/** 문의 번호로 쓸 무작위 코드 (예: 7K3FQ9AM). 순서나 건수가 드러나지 않는다. */
export function generateInquiryCode(): string {
  return Array.from(randomBytes(INQUIRY_CODE_LENGTH), (byte) => ALPHABET[byte % 32]).join('');
}

/** 주소·검색에 들어온 문의 번호를 정리한다. 형식이 맞지 않으면 null. */
export function normalizeInquiryCode(value: string): string | null {
  const code = value.trim().toUpperCase();

  return /^[0-9A-Z]{1,16}$/.test(code) ? code : null;
}
