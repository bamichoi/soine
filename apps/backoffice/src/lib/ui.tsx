// 백오피스 화면 공통 모양 (docs/design/goodplace-style-guide.md). 초이돌상·굿플레이스가 같이 쓴다.
// 회색 바탕 위 테두리 없는 둥근 흰 카드. 색은 globals.css 토큰과 그 투명도만 쓴다.

/** 클릭되는 요소의 키보드 포커스 링 */
export const FOCUS_CLASS_NAME =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

/** 옅은 글자: 번호(코드), 건수, 날짜 */
export const FAINT_CLASS_NAME = 'text-[var(--muted)]/70';

/** 행 카드, 안내 카드, 표 카드 */
export const CARD_CLASS_NAME = 'rounded-[18px] bg-[var(--surface)]';

/** 화면 첫 카드(요약·폼·달력) */
export const HERO_CLASS_NAME = 'rounded-[20px] bg-[var(--surface)] p-5 md:px-8 md:py-7';

/** 누르는 행 카드. 쉴 때 그림자 없음, hover 때 살짝 뜬다. */
export const ROW_CLASS_NAME = `${CARD_CLASS_NAME} cursor-pointer px-4 py-4 transition hover:-translate-y-px hover:shadow-(--shadow-lift) md:px-[22px] ${FOCUS_CLASS_NAME}`;

// 버튼 공통 (docs/design/goodplace-style-guide.md 4절 '버튼'). 채움 또는 1px 선 + 옅은 그림자,
// 호버 때 바탕·선·그림자가 바뀌고 누르면 1px 내려간다.
const BUTTON_BASE_CLASS_NAME = `inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none ${FOCUS_CLASS_NAME}`;

/** 보통 크기 40px */
const BUTTON_MD_CLASS_NAME = 'h-10 gap-1.5 rounded-xl px-4 text-sm font-bold';

/** 작은 크기 32px */
const BUTTON_SM_CLASS_NAME = 'h-8 gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold';

const SECONDARY_TONE_CLASS_NAME =
  'border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-(--shadow-xs) hover:border-[var(--muted)]/45 hover:bg-[var(--background)] hover:shadow-(--shadow-sm) active:bg-[var(--line)]/50 active:shadow-none';

/** 주 버튼. 한 화면에 하나 */
export const PRIMARY_BUTTON_CLASS_NAME = `${BUTTON_BASE_CLASS_NAME} ${BUTTON_MD_CLASS_NAME} border-transparent bg-[var(--brand)] text-[var(--on-accent)] shadow-(--shadow-fill) hover:bg-[var(--brand-hover)] hover:shadow-(--shadow-fill-hover) active:shadow-none active:brightness-90`;

/** 보조 버튼. 흰 바탕 + 선이라 회색 바탕 위·흰 카드·모달 안 모두 이 상수를 쓴다 */
export const SECONDARY_BUTTON_CLASS_NAME = `${BUTTON_BASE_CLASS_NAME} ${BUTTON_MD_CLASS_NAME} ${SECONDARY_TONE_CLASS_NAME}`;

/** 위험 버튼. 흰 바탕 + 빨간 선·글자 */
export const DANGER_BUTTON_CLASS_NAME = `${BUTTON_BASE_CLASS_NAME} ${BUTTON_MD_CLASS_NAME} border-[var(--error)]/30 bg-[var(--surface)] text-[var(--error)] shadow-(--shadow-xs) hover:border-[var(--error)]/60 hover:bg-[var(--error-soft)] hover:shadow-(--shadow-danger-sm) active:bg-[var(--error)]/10 active:shadow-none`;

/** 위험 확인 버튼 (모달 안). 주 모양 + 빨간 바탕 */
export const DANGER_PRIMARY_BUTTON_CLASS_NAME = `${BUTTON_BASE_CLASS_NAME} ${BUTTON_MD_CLASS_NAME} border-transparent bg-[var(--error)] text-[var(--on-accent)] shadow-(--shadow-fill) hover:bg-[var(--error)]/90 hover:shadow-(--shadow-danger-hover) active:shadow-none active:brightness-90`;

/** 작은 보조 버튼 ('매물 추가'·'기록 추가'·'다시 시도'). 보조와 같은 색 */
export const SMALL_BUTTON_CLASS_NAME = `${BUTTON_BASE_CLASS_NAME} ${BUTTON_SM_CLASS_NAME} ${SECONDARY_TONE_CLASS_NAME}`;

/**
 * 줄 안 동작 ('계약 진행'). 끝에 화살표 아이콘을 둔다:
 * <Icon name="chevron-right" className={ROW_ACTION_ICON_CLASS_NAME} />
 */
// 작은 크기와 같되 굵은 글자, 오른쪽 여백을 줄여 화살표를 붙인다 (클래스가 겹치지 않게 따로 적는다).
export const ROW_ACTION_BUTTON_CLASS_NAME = `group ${BUTTON_BASE_CLASS_NAME} h-8 gap-0.5 rounded-[10px] pr-2 pl-3 text-[13px] font-bold border-[var(--brand)]/35 bg-[var(--surface)] text-[var(--brand)] shadow-(--shadow-xs) hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] active:bg-[var(--brand)]/15 active:shadow-none`;

/** 줄 안 동작 버튼 끝 화살표. 호버 때 2px 오른쪽으로 간다 */
export const ROW_ACTION_ICON_CLASS_NAME = 'size-3.5 transition group-hover:translate-x-0.5';

/** 작은 글자 버튼 ('수정', '닫기', '검색 초기화'). 호버 때 밑줄 */
export const TEXT_BUTTON_CLASS_NAME = `shrink-0 cursor-pointer rounded-md text-[13px] font-semibold whitespace-nowrap text-[var(--muted)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline active:opacity-70 disabled:pointer-events-none disabled:opacity-45 ${FOCUS_CLASS_NAME}`;

/** 아이콘만 있는 버튼(⋮·복사·닫기). aria-label 필수 */
export const ICON_BUTTON_CLASS_NAME = `grid size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] active:bg-[var(--line)]/70 aria-expanded:bg-[var(--background)] aria-expanded:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40 ${FOCUS_CLASS_NAME}`;

/** 회색 둥근 입력칸 (input·select). textarea는 INPUT_TEXTAREA_CLASS_NAME */
export const INPUT_CLASS_NAME =
  'h-11 w-full rounded-xl border border-transparent bg-[var(--background)] px-3.5 text-[15px] outline-none placeholder:text-[var(--muted)]/70 focus:border-[var(--brand)] focus:bg-[var(--surface)] disabled:opacity-60';

export const INPUT_TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} h-auto resize-y py-3 leading-relaxed`;

/** 입력칸 안 오른쪽 단위 글자 (만원, 평, ㎡) */
export const INPUT_UNIT_CLASS_NAME =
  'pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-[var(--muted)]';

/** 폼·모달의 오류 칸 */
export const ERROR_BOX_CLASS_NAME =
  'rounded-xl bg-[var(--error-soft)] px-4 py-3 text-sm text-[var(--error)]';

/** 폼 묶음 제목 */
export const FORM_SECTION_TITLE_CLASS_NAME = 'text-[15px] font-bold';

/** 칩 (하나 고르는 필터·선택). 회색 바탕 위면 'page', 흰 카드 안이면 'card'. 그림자·바깥 선 없음 */
export function chipClassName(pressed: boolean, place: 'page' | 'card' = 'page'): string {
  const idle =
    place === 'page'
      ? 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:shadow-[inset_0_0_0_1px_var(--line)]'
      : 'bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--line)]/60 hover:text-[var(--foreground)]';

  return `inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition ${
    pressed ? 'bg-[var(--foreground)] text-[var(--surface)] hover:bg-[var(--foreground)]/90' : idle
  } ${FOCUS_CLASS_NAME}`;
}

const TAG_BASE_CLASS_NAME =
  'inline-flex h-[22px] cursor-default items-center rounded-md px-2 text-xs font-semibold whitespace-nowrap select-none';

/** 태그 (내 매물·내 손님·매물 이름 등). 누를 수 없음, 점 없음 */
export const TAG_CLASS_NAME = `${TAG_BASE_CLASS_NAME} bg-[var(--background)] text-[var(--muted)]`;

/** 사유 태그 (기록의 중단·재개·계약취소) */
export const REASON_TAG_CLASS_NAME = `${TAG_BASE_CLASS_NAME} bg-[var(--warning-soft)] text-[var(--warning)]`;

export const EMPTY_VALUE = <span className={FAINT_CLASS_NAME}>-</span>;
/** 상태 배지 색. 진행(파랑), 완료(초록), 대기(노랑), 멈춤(회색), 취소·거절(빨강). 상태별 톤은 서비스가 정한다. */
export const STATUS_TONE_CLASS_NAMES = {
  active: 'bg-[var(--brand-soft)] text-[var(--brand)]',
  done: 'bg-[var(--success-soft)] text-[var(--success)]',
  idle: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  muted: 'bg-[var(--background)] text-[var(--muted)]',
  negative: 'bg-[var(--error-soft)] text-[var(--error)]',
} as const;

export type StatusTone = keyof typeof STATUS_TONE_CLASS_NAMES;
