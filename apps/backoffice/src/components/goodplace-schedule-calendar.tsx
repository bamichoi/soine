'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GoodplaceStatusBadge } from '@/components/goodplace-status-badge';
import { ErrorNotice, GroupHead, Notice, PageHead, PeriodNav } from '@/components/page-parts';
import {
  addDays,
  addMonths,
  buildMonthDays,
  type CalendarDay,
  formatDayHeading,
  formatYearMonthParam,
  parseYearMonth,
  WEEKDAY_LABELS,
  type YearMonth,
} from '@/lib/calendar';
import { getSeoulToday, toSeoulDateAndTime } from '@/lib/choidolsang-inquiries-api';
import { formatCount, formatManwon } from '@/lib/goodplace-format';
import { type GoodplaceScheduleItem, listGoodplaceSchedule } from '@/lib/goodplace-schedule-api';
import { CONTRACT_STATUS_LABELS, MEETING_STATUS_LABELS } from '@/lib/goodplace-status';
import {
  FAINT_CLASS_NAME,
  FOCUS_CLASS_NAME,
  ROW_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

/** 넓은 화면에서 한 칸에 보여 줄 일정 수. 넘치면 +N으로 줄인다. */
const MAX_CHIPS_PER_DAY = 2;

type ScheduleKind = GoodplaceScheduleItem['kind'];

const KIND_LABELS: Record<ScheduleKind, string> = {
  balance: '잔금',
  contract: '계약',
  meeting: '미팅',
};

/** 범례 순서와 문구 */
const LEGEND: { kind: ScheduleKind; label: string }[] = [
  { kind: 'meeting', label: '미팅 (미팅 일시)' },
  { kind: 'contract', label: '계약 (계약일)' },
  { kind: 'balance', label: '잔금 (잔금일)' },
];

const CHIP_CLASS_NAMES: Record<ScheduleKind, string> = {
  balance: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  contract: 'bg-[var(--success-soft)] text-[var(--success)]',
  meeting: 'bg-[var(--brand-soft)] text-[var(--brand)]',
};

/** 아래 목록 왼쪽 52px 배지 색 */
const BADGE_CLASS_NAMES: Record<ScheduleKind, string> = {
  balance: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  contract: 'bg-[var(--success-soft)] text-[var(--success)]',
  meeting: 'bg-[var(--brand-soft)] text-[var(--brand-strong)]',
};

const DOT_CLASS_NAMES: Record<ScheduleKind, string> = {
  balance: 'bg-[var(--warning)]',
  contract: 'bg-[var(--success)]',
  meeting: 'bg-[var(--brand)]',
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; byDate: Map<string, GoodplaceScheduleItem[]> };

/** 일요일 빨강, 토요일 파랑, 나머지는 fallback */
function weekdayTextClass(weekday: number, fallback = ''): string {
  if (weekday === 0) {
    return 'text-[var(--error)]';
  }

  return weekday === 6 ? 'text-[var(--brand)]' : fallback;
}

/** 미팅은 시각, 계약·잔금은 날짜만 있으므로 시각이 없다. */
function getTime(item: GoodplaceScheduleItem): string | null {
  return item.kind === 'meeting' ? toSeoulDateAndTime(item.meetAt).time : null;
}

/** 미팅은 미팅 상세, 계약·잔금은 계약 상세 */
function getHref(item: GoodplaceScheduleItem): string {
  return item.kind === 'meeting'
    ? `/goodplace/meetings/${item.caseCode}`
    : `/goodplace/contracts/${item.id}`;
}

function getStatusLabel(item: GoodplaceScheduleItem): string {
  return item.kind === 'meeting'
    ? MEETING_STATUS_LABELS[item.status]
    : CONTRACT_STATUS_LABELS[item.status];
}

/** 미팅은 미팅 제목, 계약·잔금은 대상 매물 이름 */
function getName(item: GoodplaceScheduleItem): string {
  return item.kind === 'meeting' ? item.title : item.listingName;
}

// 날짜별로 묶는다. 하루 안에서는 계약·잔금(시각 없음)을 먼저, 미팅은 시각순으로 둔다.
function groupByDate(items: GoodplaceScheduleItem[]): Map<string, GoodplaceScheduleItem[]> {
  const byDate = new Map<string, GoodplaceScheduleItem[]>();
  const sorted = [...items].sort((a, b) => (getTime(a) ?? '').localeCompare(getTime(b) ?? ''));

  for (const item of sorted) {
    byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  }

  return byDate;
}

type DayCellProps = {
  day: CalendarDay;
  isToday: boolean;
  isSelected: boolean;
  items: GoodplaceScheduleItem[];
  onSelect: (date: string) => void;
};

function chipClassName(item: GoodplaceScheduleItem, isSelected: boolean): string {
  // 고른 날(연한 파랑 바탕)에서는 미팅 칩이 묻히지 않게 흰 바탕으로 둔다.
  return isSelected && item.kind === 'meeting'
    ? 'bg-[var(--surface)] text-[var(--brand)]'
    : CHIP_CLASS_NAMES[item.kind];
}

function DayCell({ day, isToday, isSelected, items, onSelect }: DayCellProps) {
  const hidden = items.length - MAX_CHIPS_PER_DAY;
  const otherMonth = day.isCurrentMonth ? '' : 'opacity-40';

  return (
    <td className="p-0 align-top">
      <button
        aria-label={`${formatDayHeading(day.date)} 일정 ${items.length}건`}
        aria-pressed={isSelected}
        className={`flex h-16 w-full cursor-pointer flex-col gap-1 rounded-xl p-1.5 text-left sm:h-28 sm:p-2 ${
          isSelected ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--background)]'
        } ${FOCUS_CLASS_NAME}`}
        onClick={() => onSelect(day.date)}
        type="button"
      >
        <time
          className={`grid size-6 shrink-0 place-items-center rounded-full text-[13px] tabular-nums ${
            isToday
              ? 'bg-[var(--brand)] font-bold text-[var(--on-accent)]'
              : `font-semibold ${weekdayTextClass(day.weekday)} ${otherMonth}`
          }`}
          dateTime={day.date}
        >
          {day.day}
        </time>

        {/* 좁은 화면: 점으로 일정 수만 */}
        {items.length > 0 ? (
          <span aria-hidden="true" className={`flex flex-wrap gap-0.5 sm:hidden ${otherMonth}`}>
            {items.slice(0, 4).map((item) => (
              <span
                className={`size-1.5 rounded-full ${DOT_CLASS_NAMES[item.kind]}`}
                key={`${item.kind}-${item.id}`}
              />
            ))}
          </span>
        ) : null}

        {/* 넓은 화면: 시각(미팅)과 미팅 제목·매물 이름 */}
        <span
          aria-hidden="true"
          className={`hidden w-full min-w-0 flex-col gap-0.5 sm:flex ${otherMonth}`}
        >
          {items.slice(0, MAX_CHIPS_PER_DAY).map((item) => (
            <span
              className={`truncate rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold ${chipClassName(item, isSelected)}`}
              key={`${item.kind}-${item.id}`}
            >
              <span className="tabular-nums">{getTime(item) ?? KIND_LABELS[item.kind]}</span>{' '}
              {getName(item)}
            </span>
          ))}
          {hidden > 0 ? (
            <span className={`px-1.5 text-[11px] font-semibold ${FAINT_CLASS_NAME}`}>
              +{hidden}건
            </span>
          ) : null}
        </span>
      </button>
    </td>
  );
}

function CalendarTop() {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <ul
        aria-label="달력 색 안내"
        className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs font-semibold text-[var(--muted)]"
      >
        {LEGEND.map(({ kind, label }) => (
          <li className="inline-flex items-center gap-1.5" key={kind}>
            <span aria-hidden="true" className={`size-2 rounded-full ${DOT_CLASS_NAMES[kind]}`} />
            {label}
          </li>
        ))}
      </ul>
      <p className={`text-xs ${FAINT_CLASS_NAME}`}>진행중단 미팅과 취소된 계약은 표시하지 않음</p>
    </div>
  );
}

function ScheduleRow({ item }: { item: GoodplaceScheduleItem }) {
  return (
    <li>
      <Link
        className={`${ROW_CLASS_NAME} grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[56px_minmax(0,1fr)_auto] md:gap-[18px]`}
        href={getHref(item)}
      >
        <span
          className={`flex size-[52px] flex-col items-center justify-center rounded-2xl leading-[1.15] ${BADGE_CLASS_NAMES[item.kind]}`}
        >
          <b className="text-[15px] font-extrabold tabular-nums">{getTime(item) ?? '종일'}</b>
          <span className="text-[11px] font-bold">{KIND_LABELS[item.kind]}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold">{getName(item)}</span>
          <span className="mt-0.5 block truncate text-sm text-[var(--muted)]">
            {item.customerName} · 케이스{' '}
            <span className={`font-mono text-xs ${FAINT_CLASS_NAME}`} translate="no">
              {item.caseCode}
            </span>
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          {item.kind === 'balance' ? (
            <b className="text-base font-extrabold whitespace-nowrap tabular-nums">
              잔금 {formatManwon(item.balance)}
            </b>
          ) : null}
          <GoodplaceStatusBadge label={getStatusLabel(item)} status={item.status} />
        </span>
      </Link>
    </li>
  );
}

function DaySchedule({ date, state }: { date: string; state: LoadState }) {
  const items = state.kind === 'loaded' ? (state.byDate.get(date) ?? []) : [];

  return (
    <section aria-label={`${formatDayHeading(date)} 일정`} aria-live="polite">
      <GroupHead
        count={state.kind === 'loaded' ? `${formatCount(items.length)}건` : null}
        title={`${formatDayHeading(date)} 일정`}
      />
      {state.kind === 'loading' ? <Notice text="불러오고 있습니다." /> : null}
      {state.kind === 'loaded' && items.length === 0 ? (
        <Notice text="이날은 일정이 없습니다." />
      ) : null}
      {items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <ScheduleRow item={item} key={`${item.kind}-${item.id}`} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// 굿플레이스 일정 달력. 보고 있는 달은 주소(?month=2026-11)에 남겨 새로고침해도 유지한다.
// 미팅은 미팅 일시, 계약은 계약일, 잔금은 잔금일 칸에 표시하고, 날짜를 누르면 아래에 그날 일정을 보여 준다.
export function GoodplaceScheduleCalendar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = getSeoulToday();
  const thisMonth = parseYearMonth(today.slice(0, 7)) as YearMonth;
  const current = parseYearMonth(searchParams.get('month')) ?? thisMonth;
  const days = buildMonthDays(current);
  const weeks = Array.from({ length: days.length / 7 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );
  const isThisMonth = current.year === thisMonth.year && current.month === thisMonth.month;
  const rangeFrom = days[0].date;
  const rangeTo = addDays(days[days.length - 1].date, 1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 고른 날짜가 보고 있는 달이 아니면 오늘(이번 달) 또는 그 달 1일을 고른다.
  const monthPrefix = formatYearMonthParam(current);
  let activeDate = `${monthPrefix}-01`;

  if (selectedDate?.startsWith(monthPrefix)) {
    activeDate = selectedDate;
  } else if (isThisMonth) {
    activeDate = today;
  }

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 기간을 다시 불러오기 위한 값이다.
    void reloadKey;
    listGoodplaceSchedule(rangeFrom, rangeTo)
      .then((items) => {
        if (isActive) {
          setState({ byDate: groupByDate(items), kind: 'loaded' });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, [rangeFrom, rangeTo, reloadKey]);

  function goTo(target: YearMonth) {
    const isTargetThisMonth = target.year === thisMonth.year && target.month === thisMonth.month;
    router.replace(
      isTargetThisMonth ? pathname : `${pathname}?month=${formatYearMonthParam(target)}`,
      { scroll: false },
    );
  }

  return (
    <div>
      {/* 수입과 같은 기간 이동. 오늘을 고른 상태일 때만 '오늘'을 누를 수 없다. */}
      <PageHead title="일정">
        <button
          className={SECONDARY_BUTTON_CLASS_NAME}
          disabled={activeDate === today}
          onClick={() => {
            setSelectedDate(today);
            if (!isThisMonth) {
              goTo(thisMonth);
            }
          }}
          type="button"
        >
          오늘
        </button>
        <PeriodNav
          label={`${current.year}년 ${current.month}월`}
          next={{ label: '다음 달', onClick: () => goTo(addMonths(current, 1)) }}
          previous={{ label: '이전 달', onClick: () => goTo(addMonths(current, -1)) }}
        />
      </PageHead>

      {state.kind === 'error' ? (
        <div className="mb-3">
          <ErrorNotice
            onRetry={() => setReloadKey((key) => key + 1)}
            text="일정을 불러오지 못했습니다."
          />
        </div>
      ) : null}

      <section aria-label="일정 달력" className="rounded-[20px] bg-[var(--surface)] p-4 md:p-6">
        <CalendarTop />
        <table className="-mx-1 w-[calc(100%+0.5rem)] table-fixed border-separate border-spacing-1">
          <caption className="sr-only">
            {current.year}년 {current.month}월 달력
          </caption>
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((label, weekday) => (
                <th
                  className={`py-2 text-center text-xs font-semibold ${weekdayTextClass(weekday, 'text-[var(--muted)]')}`}
                  key={label}
                  scope="col"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].date}>
                {week.map((day) => (
                  <DayCell
                    day={day}
                    isSelected={day.date === activeDate}
                    isToday={day.date === today}
                    items={state.kind === 'loaded' ? (state.byDate.get(day.date) ?? []) : []}
                    key={day.date}
                    onSelect={setSelectedDate}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <DaySchedule date={activeDate} state={state} />
    </div>
  );
}
