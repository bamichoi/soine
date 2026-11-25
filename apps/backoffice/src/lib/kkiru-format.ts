/** 1평 = 3.305785㎡ */
export const SQUARE_METERS_PER_PYEONG = 3.305785;

export function squareMetersToPyeong(areaM2: number): number {
  return areaM2 / SQUARE_METERS_PER_PYEONG;
}

export function pyeongToSquareMeters(pyeong: number): number {
  return pyeong * SQUARE_METERS_PER_PYEONG;
}

/** 숫자를 소수 첫째 자리까지 (끝의 .0은 뺀다) */
export function formatDecimal(value: number, digits = 1): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

/** 66.12㎡ → "66.12㎡ (20평)" */
export function formatArea(areaM2: number): string {
  return `${formatDecimal(areaM2, 2)}㎡ (${formatDecimal(squareMetersToPyeong(areaM2))}평)`;
}

/** 3000 → "3,000만원" */
export function formatManwon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}만원`;
}

/** 금액 입력칸(만원): 숫자만 남기고 천 단위 쉼표 */
export function toManwonText(value: string): string {
  const digits = value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 8);
  return digits ? Number(digits).toLocaleString('ko-KR') : '';
}

export function parseManwonText(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/** 소수 입력칸(면적·평): 숫자와 점 하나, 소수 둘째 자리까지 */
export function toDecimalText(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  const fraction = rest.join('').slice(0, 2);
  return rest.length > 0 ? `${whole}.${fraction}` : whole;
}

export function parseDecimalText(text: string): number | null {
  if (!text || text === '.') {
    return null;
  }

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
