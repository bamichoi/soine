import type { ReactNode } from 'react';
import { Icon } from '@/components/icon';
import { formatCount } from '@/lib/goodplace-format';
import {
  CARD_CLASS_NAME,
  chipClassName,
  FAINT_CLASS_NAME,
  FOCUS_CLASS_NAME,
  SMALL_BUTTON_CLASS_NAME,
} from '@/lib/ui';

// 백오피스 화면 공용 부품 (docs/design/goodplace-style-guide.md). 초이돌상·굿플레이스 화면이 같이 쓴다.

// ---------------------------------------------------------------- 제목 줄

type PageHeadProps = {
  title: ReactNode;
  /** 제목 옆 건수 (예: "166건") */
  count?: string | null;
  /** 제목 위 한 줄 (상세: 번호·복사·상태) */
  meta?: ReactNode;
  /** 오른쪽 컨트롤(세그먼트·기간 이동·버튼). 모바일은 다음 줄 전체 폭 */
  children?: ReactNode;
  controlsClassName?: string;
};

const CONTROLS_CLASS_NAME =
  'flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start';

/** 화면 제목 줄. 왼쪽 h2(+건수), 오른쪽 컨트롤 */
export function PageHead({
  title,
  count,
  meta,
  children,
  controlsClassName = CONTROLS_CLASS_NAME,
}: PageHeadProps) {
  const heading = (
    <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
      {title}
      {count ? (
        <em className="ml-2 text-[17px] font-bold text-[var(--brand)] not-italic tabular-nums">
          {count}
        </em>
      ) : null}
    </h2>
  );

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mt-2">
      {meta ? (
        <div className="min-w-0">
          {meta}
          {heading}
        </div>
      ) : (
        heading
      )}
      {children ? <div className={controlsClassName}>{children}</div> : null}
    </div>
  );
}

/** 상세 제목 위 한 줄: `케이스 RDRT7HQB [복사] [상태]` */
export function HeadMeta({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--muted)]">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------- 기간 이동

type PeriodMove = { label: string; onClick: (() => void) | null };

const PERIOD_BUTTON_CLASS_NAME = `grid size-[34px] cursor-pointer place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] active:bg-[var(--line)]/70 disabled:pointer-events-none disabled:opacity-40 ${FOCUS_CLASS_NAME}`;

/** 이전 · 기간 · 다음. 갈 수 없는 쪽은 onClick을 null로 */
export function PeriodNav({
  label,
  previous,
  next,
}: {
  label: string;
  previous: PeriodMove;
  next: PeriodMove;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[14px] bg-[var(--surface)] p-1">
      <button
        aria-label={previous.label}
        className={PERIOD_BUTTON_CLASS_NAME}
        disabled={previous.onClick === null}
        onClick={previous.onClick ?? undefined}
        type="button"
      >
        <Icon name="chevron-left" />
      </button>
      <strong
        aria-live="polite"
        className="min-w-[100px] text-center text-[15px] font-bold tabular-nums sm:min-w-[116px]"
      >
        {label}
      </strong>
      <button
        aria-label={next.label}
        className={PERIOD_BUTTON_CLASS_NAME}
        disabled={next.onClick === null}
        onClick={next.onClick ?? undefined}
        type="button"
      >
        <Icon name="chevron-right" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- 칩

/** 하나만 고르는 칩. 눌림은 색과 aria-pressed로 함께 알린다. */
export function Chip({
  pressed,
  onClick,
  place = 'page',
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  /** 회색 바탕 위(page) 또는 흰 카드 안(card) */
  place?: 'page' | 'card';
  children: ReactNode;
}) {
  return (
    <button
      aria-pressed={pressed}
      className={chipClassName(pressed, place)}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function ChipCount({ pressed, count }: { pressed: boolean; count: number }) {
  return (
    <span
      className={`ml-1 font-bold tabular-nums ${pressed ? 'text-[var(--line)]' : FAINT_CLASS_NAME}`}
    >
      {formatCount(count)}
    </span>
  );
}

// ---------------------------------------------------------------- 묶음 머리

/** 카드 위 묶음 머리: 19px 제목 + 브랜드색 건수, 오른쪽에 칩·작은 버튼 */
export function GroupHead({
  title,
  count,
  children,
}: {
  title: ReactNode;
  /** 예: "3건". 없으면 건수를 보이지 않는다. */
  count?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="mt-7 mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-[19px] font-extrabold">
        {title}
        {count ? (
          <em className="ml-1.5 text-[var(--brand)] not-italic tabular-nums">{count}</em>
        ) : null}
      </h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- 안내 카드

/** 불러오는 중·없음 안내 카드 */
export function Notice({ text }: { text: ReactNode }) {
  return (
    <p className={`px-6 py-10 text-center text-sm text-[var(--muted)] ${CARD_CLASS_NAME}`}>
      {text}
    </p>
  );
}

/** 불러오기 실패 카드. onRetry가 있으면 '다시 시도' */
export function ErrorNotice({ text, onRetry }: { text: ReactNode; onRetry?: () => void }) {
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-10 ${CARD_CLASS_NAME}`} role="alert">
      <p className="text-sm text-[var(--error)]">{text}</p>
      {onRetry ? (
        <button className={SMALL_BUTTON_CLASS_NAME} onClick={onRetry} type="button">
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
