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

/** 연락처가 국내 번호 형식(0으로 시작, 9~11자리)인지 */
export function isValidPhone(value: string): boolean {
  return /^0\d{8,10}$/.test(value.replace(/\D/g, ''));
}
