import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  KkiruChip,
  KkiruChipCount,
  KkiruError,
  KkiruGroupHead,
  KkiruNotice,
  KkiruPageHead,
  KkiruPeriodNav,
} from '@/components/kkiru-parts';
import { WEEKDAY_LABELS } from '@/lib/calendar';
import { formatCount, formatManwon } from '@/lib/kkiru-format';
import type {
  IncomeBar,
  IncomeYearMonthCard,
  KkiruIncomeContract,
  KkiruIncomeMine,
  KkiruIncomeState,
} from '@/lib/kkiru-income-api';
import {
  CARD_CLASS_NAME,
  FAINT_CLASS_NAME,
  FOCUS_CLASS_NAME,
  TAG_CLASS_NAME,
} from '@/lib/kkiru-ui';

// 시안 A(docs/design/kkiru-income-style-a.html)의 카드형 화면 조각.
// 시안의 전용 색은 globals.css 토큰으로 맞춘다.
//   옅은 글자 #98a2b3 → muted 70%, 보조 글자 #4e5968·#6b7684 → muted,
//   칩·알약 바탕 #f2f4f6 → background, 세그먼트 바탕 #e5e8eb·구분선 #d1d6db → line,
//   막대(다른 달 확정) #cfdcee → brand 20%, 예정 점 #a9c1e3 → brand 35%.

const ROW_CLASS_NAME = `grid cursor-pointer items-center gap-3 px-4 py-4 transition hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)] md:gap-[18px] md:px-[22px] ${CARD_CLASS_NAME} ${FOCUS_CLASS_NAME}`;

const STATE_LABELS: Record<KkiruIncomeState, string> = { confirmed: '확정', expected: '예정' };
const DOT_CLASS_NAMES: Record<KkiruIncomeState, string> = {
  confirmed: 'bg-[var(--brand)]',
  expected: 'bg-[var(--brand)]/35',
};

function Dot({ state }: { state: KkiruIncomeState }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 shrink-0 rounded-full ${DOT_CLASS_NAMES[state]}`}
    />
  );
}

// ---------------------------------------------------------------- 제목 줄: 월별|연간, 기간 이동

type HeadProps = {
  kind: 'month' | 'year';
  label: string;
  onKindChange: (kind: 'month' | 'year') => void;
  previous: { label: string; onClick: (() => void) | null };
  next: { label: string; onClick: (() => void) | null };
};

export function IncomeHead({ kind, label, onKindChange, previous, next }: HeadProps) {
  return (
    <KkiruPageHead title="수입">
      <fieldset
        aria-label="보기 단위"
        className="m-0 inline-flex rounded-[14px] border-0 bg-[var(--line)] p-1"
      >
        {(['month', 'year'] as const).map((value) => (
          <button
            aria-pressed={kind === value}
            className={`cursor-pointer rounded-[10px] px-4 py-[7px] text-sm font-bold transition ${
              kind === value
                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]'
                : 'text-[var(--muted)] hover:bg-[var(--surface)]/50 hover:text-[var(--foreground)]'
            } ${FOCUS_CLASS_NAME}`}
            key={value}
            onClick={() => onKindChange(value)}
            type="button"
          >
            {value === 'month' ? '월별' : '연간'}
          </button>
        ))}
      </fieldset>
      <KkiruPeriodNav label={label} next={next} previous={previous} />
    </KkiruPageHead>
  );
}

// ---------------------------------------------------------------- 첫 카드: 합계와 흐름 막대

function SplitPill({
  state,
  amount,
  count,
}: {
  state: KkiruIncomeState;
  amount: number;
  count: number;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-[var(--background)] px-4 py-3.5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--muted)]">
        <Dot state={state} />
        {STATE_LABELS[state]}수입
      </p>
      {count === 0 ? (
        <p className={`mt-1 text-xl font-bold ${FAINT_CLASS_NAME}`}>없음</p>
      ) : (
        <p className="mt-1 text-xl font-extrabold break-all tabular-nums">{formatManwon(amount)}</p>
      )}
      <p className={`mt-0.5 text-xs tabular-nums ${FAINT_CLASS_NAME}`}>
        계약 {formatCount(count)}건
      </p>
    </div>
  );
}

type BarsProps = {
  year: number;
  bars: IncomeBar[];
  /** 보고 있는 달. 연간이면 null */
  currentMonth: number | null;
  monthHref: (month: number) => string;
};

/** 막대 높이: 그 해 가장 큰 달을 80%로 둔다(위쪽은 툴팁 자리). */
const BAR_MAX_PERCENT = 80;

function barTipText({ month, confirmedAmount, expectedAmount }: IncomeBar) {
  const total = confirmedAmount + expectedAmount;
  const part = (amount: number) => (amount > 0 ? formatCount(amount) : '없음');

  return {
    detail: total > 0 ? `확정 ${part(confirmedAmount)} · 예정 ${part(expectedAmount)}` : null,
    title: `${month}월 ${total > 0 ? formatManwon(total) : '없음'}`,
  };
}

function IncomeBars({ year, bars, currentMonth, monthHref }: BarsProps) {
  const max = Math.max(...bars.map((bar) => bar.confirmedAmount + bar.expectedAmount), 0);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold">{year}년 흐름</h3>
        <ul aria-label="막대 색 안내" className="flex gap-3 text-xs text-[var(--muted)]">
          {(['confirmed', 'expected'] as const).map((state) => (
            <li className="inline-flex items-center gap-1.5" key={state}>
              <Dot state={state} />
              {STATE_LABELS[state]}
            </li>
          ))}
        </ul>
      </div>
      <ul
        aria-label={`${year}년 월별 수입`}
        className="relative mt-3.5 grid h-[132px] grid-cols-12 items-end gap-1.5 sm:gap-2.5"
      >
        {bars.map((bar) => {
          const total = bar.confirmedAmount + bar.expectedAmount;
          const height = max > 0 ? (total / max) * BAR_MAX_PERCENT : 0;
          const confirmedShare = total > 0 ? (bar.confirmedAmount / total) * 100 : 0;
          const isCurrent = bar.month === currentMonth;
          const tip = barTipText(bar);
          // 왼쪽 여섯 달은 툴팁을 오른쪽으로, 나머지는 왼쪽으로 펼쳐 카드 밖으로 나가지 않게 한다.
          const tipStyle: CSSProperties = {
            bottom: `calc(${height}% + 30px)`,
            ...(bar.month <= 6 ? { left: '-8px' } : { right: '-8px' }),
          };

          return (
            <li className="group/bar relative h-full" key={bar.month}>
              <Link
                aria-current={isCurrent ? 'date' : undefined}
                aria-label={`${year}년 ${tip.title}${tip.detail ? `, ${tip.detail}` : ''}. 이 달 보기`}
                className={`flex h-full cursor-pointer flex-col items-center justify-end gap-1.5 rounded-md ${FOCUS_CLASS_NAME}`}
                href={monthHref(bar.month)}
                scroll={false}
              >
                <span
                  aria-hidden="true"
                  className="flex w-3.5 flex-col-reverse overflow-hidden rounded-[7px]"
                  style={{ height: `${height}%` }}
                >
                  <span
                    className={`block w-full ${
                      isCurrent ? 'bg-[var(--brand)]' : 'bg-[var(--brand)]/20'
                    } group-hover/bar:bg-[var(--brand-hover)]`}
                    style={{ height: `${confirmedShare}%` }}
                  />
                  <span
                    className="block w-full bg-[var(--brand-soft)]"
                    style={{ height: `${100 - confirmedShare}%` }}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={`text-[11px] tabular-nums ${
                    isCurrent
                      ? 'font-extrabold text-[var(--brand)]'
                      : `font-semibold ${FAINT_CLASS_NAME}`
                  }`}
                >
                  {bar.month}
                </span>
              </Link>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute z-10 hidden rounded-[10px] bg-[var(--foreground)] px-2.5 py-[7px] text-xs whitespace-nowrap text-[var(--surface)] tabular-nums group-hover/bar:block group-has-[a:focus-visible]/bar:block"
                style={tipStyle}
              >
                <b className="block text-[13px]">{tip.title}</b>
                {tip.detail}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type HeroProps = {
  label: string;
  confirmed: { amount: number; count: number };
  expected: { amount: number; count: number };
} & BarsProps;

/** 첫 카드. 왼쪽 합계(확정+예정)와 두 알약, 오른쪽 그 해 흐름 막대. xl 미만은 막대를 아래로 */
export function IncomeHero({ label, confirmed, expected, ...bars }: HeroProps) {
  const total = confirmed.amount + expected.amount;

  return (
    <section
      aria-label={`${label} 요약`}
      className="grid gap-6 rounded-[20px] bg-[var(--surface)] p-5 md:px-8 md:py-7 xl:grid-cols-[1fr_420px] xl:gap-8"
    >
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[var(--muted)]">{label}</p>
        <p className="mt-1.5 text-[36px] leading-[1.15] font-extrabold tracking-[-0.03em] break-all tabular-nums md:text-[44px]">
          {formatCount(total)}
          <small className="ml-0.5 text-[22px] font-bold md:text-[26px]">만원</small>
        </p>
        <div className="mt-[22px] flex gap-3">
          <SplitPill amount={confirmed.amount} count={confirmed.count} state="confirmed" />
          <SplitPill amount={expected.amount} count={expected.count} state="expected" />
        </div>
      </div>
      <IncomeBars {...bars} />
    </section>
  );
}

// ---------------------------------------------------------------- 목록 머리: 제목과 칩

const MINE_CHIPS: { value: KkiruIncomeMine | null; label: string }[] = [
  { label: '전체 계약', value: null },
  { label: '내 매물', value: 'listing' },
  { label: '내 손님', value: 'client' },
];
const STATE_CHIPS: { value: KkiruIncomeState | null; label: string }[] = [
  { label: '전체', value: null },
  { label: '확정', value: 'confirmed' },
  { label: '예정', value: 'expected' },
];

type FiltersProps = {
  title: string;
  count: number;
  counts: { all: number; listing: number; client: number };
  mine: KkiruIncomeMine | null;
  state: KkiruIncomeState | null;
  onMineChange: (mine: KkiruIncomeMine | null) => void;
  onStateChange: (state: KkiruIncomeState | null) => void;
};

export function IncomeFilters({
  title,
  count,
  counts,
  mine,
  state,
  onMineChange,
  onStateChange,
}: FiltersProps) {
  return (
    <KkiruGroupHead count={`${formatCount(count)}건`} title={title}>
      <div className="flex flex-wrap items-center gap-2">
        <fieldset aria-label="구분" className="m-0 flex gap-2 border-0 p-0">
          {MINE_CHIPS.map((chip) => (
            <KkiruChip
              key={chip.label}
              onClick={() => onMineChange(chip.value)}
              pressed={mine === chip.value}
            >
              {chip.label}
              <KkiruChipCount count={counts[chip.value ?? 'all']} pressed={mine === chip.value} />
            </KkiruChip>
          ))}
        </fieldset>
        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-[var(--line)] sm:block" />
        <fieldset aria-label="상태" className="m-0 flex gap-2 border-0 p-0">
          {STATE_CHIPS.map((chip) => (
            <KkiruChip
              key={chip.label}
              onClick={() => onStateChange(chip.value)}
              pressed={state === chip.value}
            >
              {chip.label}
            </KkiruChip>
          ))}
        </fieldset>
      </div>
    </KkiruGroupHead>
  );
}

// ---------------------------------------------------------------- 목록: 계약 카드, 달 카드

function DayBadge({ top, bottom, hidden }: { top: ReactNode; bottom: string; hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className="flex size-[52px] flex-col items-center justify-center rounded-2xl bg-[var(--brand-soft)] leading-[1.1] text-[var(--brand-strong)]"
    >
      <b className="text-lg font-extrabold tabular-nums">{top}</b>
      <span className="text-[11px] font-semibold">{bottom}</span>
    </div>
  );
}

function StateMark({ state }: { state: KkiruIncomeState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
        state === 'confirmed' ? 'text-[var(--brand)]' : 'text-[var(--muted)]'
      }`}
    >
      <Dot state={state} />
      {STATE_LABELS[state]}
    </span>
  );
}

function MineTags({ contract, className }: { contract: KkiruIncomeContract; className: string }) {
  const labels = [
    ...(contract.isMyListing ? ['내 매물'] : []),
    ...(contract.isMyClient ? ['내 손님'] : []),
  ];

  return labels.length > 0 ? (
    <span className={`flex-wrap gap-1.5 ${className}`}>
      {labels.map((label) => (
        <span className={TAG_CLASS_NAME} key={label}>
          {label}
        </span>
      ))}
    </span>
  ) : null;
}

/** 잔금일의 요일 (UTC로 계산해 기기 시간대와 상관없다) */
function weekdayOf(date: string): string {
  return WEEKDAY_LABELS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/** 월별 목록. 행 전체가 계약 상세 링크다. md 미만은 구분 칩을 매물 아래로 내린다. */
export function IncomeContractList({ contracts }: { contracts: KkiruIncomeContract[] }) {
  return (
    <ul className="grid gap-2">
      {contracts.map((contract) => (
        <li key={contract.id}>
          <Link
            className={`${ROW_CLASS_NAME} grid-cols-[52px_minmax(0,1fr)_auto] md:grid-cols-[56px_minmax(0,1fr)_auto_140px]`}
            href={`/kkiru/contracts/${contract.id}`}
          >
            <DayBadge
              bottom={weekdayOf(contract.balanceDueOn)}
              top={Number(contract.balanceDueOn.slice(8, 10))}
            />
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-2 text-base font-bold">
                <span className="truncate">{contract.customer.name}</span>
                <span
                  className={`shrink-0 font-mono text-xs font-medium ${FAINT_CLASS_NAME}`}
                  translate="no"
                >
                  {contract.caseCode}
                </span>
              </p>
              <p
                className="mt-0.5 truncate text-sm text-[var(--muted)]"
                title={contract.listing.name}
              >
                {contract.listing.name}
              </p>
              <MineTags className="mt-1.5 flex md:hidden" contract={contract} />
            </div>
            <MineTags className="hidden md:flex" contract={contract} />
            <div className="text-right">
              <b className="block text-lg font-extrabold whitespace-nowrap tabular-nums">
                {formatManwon(contract.commission)}
              </b>
              <StateMark state={contract.incomeState} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type YearListProps = {
  year: number;
  cards: IncomeYearMonthCard[];
  /** 상태 필터. 고르면 그 상태 금액만 보인다. */
  state: KkiruIncomeState | null;
  monthHref: (month: number) => string;
};

/** 연간 목록. 계약이 있는 달만 카드 한 장씩, 누르면 그 달 월별로 내려간다. */
export function IncomeYearList({ year, cards, state, monthHref }: YearListProps) {
  return (
    <ul className="grid gap-2">
      {cards.map((card) => {
        const total = card.confirmedAmount + card.expectedAmount;
        const part = (amount: number) => (amount > 0 ? formatCount(amount) : '없음');

        return (
          <li key={card.month}>
            <Link
              className={`${ROW_CLASS_NAME} grid-cols-[52px_minmax(0,1fr)_auto] md:grid-cols-[56px_minmax(0,1fr)_auto]`}
              href={monthHref(card.month)}
            >
              <DayBadge bottom="월" hidden top={card.month} />
              <div className="min-w-0">
                <p className="text-base font-bold">
                  {year}년 {card.month}월
                </p>
                <p className="mt-0.5 text-sm text-[var(--muted)] tabular-nums">
                  계약 {formatCount(card.count)}건
                </p>
              </div>
              <div className="text-right">
                <b className="block text-lg font-extrabold whitespace-nowrap tabular-nums">
                  {formatManwon(total)}
                </b>
                {state ? (
                  <StateMark state={state} />
                ) : (
                  <span className="text-xs whitespace-nowrap text-[var(--muted)] tabular-nums">
                    확정 {part(card.confirmedAmount)} · 예정 {part(card.expectedAmount)}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- 안내 카드

export function IncomeNotice({ text }: { text: string }) {
  return <KkiruNotice text={text} />;
}

export function IncomeError({ onRetry }: { onRetry: () => void }) {
  return <KkiruError onRetry={onRetry} text="수입을 불러오지 못했습니다." />;
}
