/** 250000 → 250,000원 */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 금액 입력칸: 숫자만 남기고 천 단위 쉼표를 붙인다. */
export function toAmountText(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits ? Number(digits).toLocaleString('ko-KR') : '';
}

/** 금액 입력칸 글 → 숫자. 비어 있으면 null */
export function parseAmountText(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}
