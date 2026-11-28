/** 숫자만 남긴 연락처에 하이픈을 붙인다. 01012345678 → 010-1234-5678, 0212345678 → 02-1234-5678 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.startsWith('02')) {
    if (digits.length <= 2) {
      return digits;
    }

    const middleLength = digits.length >= 10 ? 4 : 3;
    return [digits.slice(0, 2), digits.slice(2, 2 + middleLength), digits.slice(2 + middleLength)]
      .filter(Boolean)
      .join('-');
  }

  if (digits.length <= 3) {
    return digits;
  }

  const middleLength = digits.length >= 11 ? 4 : 3;
  return [digits.slice(0, 3), digits.slice(3, 3 + middleLength), digits.slice(3 + middleLength)]
    .filter(Boolean)
    .join('-');
}

/** 휴대폰 번호(010 + 8자리, 010-0000-0000)인지. 백오피스 연락처는 이것만 받는다. */
export function isValidMobilePhone(value: string): boolean {
  return /^010\d{8}$/.test(value.replace(/\D/g, ''));
}
