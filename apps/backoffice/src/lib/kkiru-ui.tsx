// 끼루 상세 화면에서 함께 쓰는 버튼 모양과 빈 값 표시

export const SECONDARY_BUTTON_CLASS_NAME =
  'flex h-10 items-center border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50';

export const PRIMARY_BUTTON_CLASS_NAME =
  'flex h-10 items-center bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50';

export const EMPTY_VALUE = <span className="text-[var(--muted)]">-</span>;
