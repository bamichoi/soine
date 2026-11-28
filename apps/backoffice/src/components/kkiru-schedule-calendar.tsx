'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
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
import { formatManwon } from '@/lib/kkiru-format';
import { type KkiruScheduleItem, listKkiruSchedule } from '@/lib/kkiru-schedule-api';
import { CONTRACT_STATUS_LABELS, MEETING_STATUS_LABELS } from '@/lib/kkiru-status';

const NAV_BUTTON_CLASS_NAME =
  'flex h-9 min-w-9 items-center justify-center border border-[var(--line)] bg-[var(--surface)] px-3 text-sm hover:bg-[var(--background)]';

/** 넓은 화면에서 한 칸에 보여 줄 일정 수. 넘치면 +N으로 줄인다. */
const MAX_CHIPS_PER_DAY = 2;

type ScheduleKind = KkiruScheduleItem['kind'];

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

const DOT_CLASS_NAMES: Record<ScheduleKind, string> = {
  balance: 'bg-[var(--warning)]',
  contract: 'bg-[var(--success)]',
  meeting: 'bg-[var(--brand)]',
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; byDate: Map<string, KkiruScheduleItem[]> };

function weekdayTextClass(weekday: number): string {
  if (weekday === 0) {
    return 'text-[var(--error)]';
  }

  return weekday === 6 ? 'text-[var(--brand)]' : '';
}

/** 미팅은 시각, 계약·잔금은 날짜만 있으므로 시각이 없다. */
function getTime(item: KkiruScheduleItem): string | null {
  return item.kind === 'meeting' ? toSeoulDateAndTime(item.meetAt).time : null;
}

/** 미팅은 미팅 상세, 계약·잔금은 계약 상세 */
function getHref(item: KkiruScheduleItem): string {
  return item.kind === 'meeting'
    ? `/kkiru/meetings/${item.caseCode}`
    : `/kkiru/contracts/${item.id}`;
}

function getStatusLabel(item: KkiruScheduleItem): string {
  return item.kind === 'meeting'
    ? MEETING_STATUS_LABELS[item.status]
    : CONTRACT_STATUS_LABELS[item.status];
}

/** 미팅은 미팅 제목, 계약·잔금은 대상 매물 이름 */
function getName(item: KkiruScheduleItem): string {
  return item.kind === 'meeting' ? item.title : item.listingName;
}

// 날짜별로 묶는다. 하루 안에서는 계약·잔금(시각 없음)을 먼저, 미팅은 시각순으로 둔다.
function groupByDate(items: KkiruScheduleItem[]): Map<string, KkiruScheduleItem[]> {
  const byDate = new Map<string, KkiruScheduleItem[]>();
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
  items: KkiruScheduleItem[];
  onSelect: (date: string) => void;
};

function DayCell({ day, isToday, isSelected, items, onSelect }: DayCellProps) {
  const hidden = items.length - MAX_CHIPS_PER_DAY;

  return (
    <td
      className={`h-20 border border-[var(--line)] p-0 align-top sm:h-28 ${
        day.isCurrentMonth ? 'bg-[var(--surface)]' : 'bg-[var(--background)]'
      }`}
    >
      <button
        aria-label={`${formatDayHeading(day.date)} 일정 ${items.length}건`}
        aria-pressed={isSelected}
        className={`flex size-full flex-col gap-1 p-1.5 text-left sm:p-2 ${
          isSelected ? 'ring-2 ring-[var(--brand)] ring-inset' : 'hover:bg-[var(--background)]'
        }`}
        onClick={() => onSelect(day.date)}
        type="button"
      >
        <time
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums sm:text-sm ${
            isToday
              ? 'bg-[var(--brand)] font-semibold text-white'
              : `${weekdayTextClass(day.weekday)} ${day.isCurrentMonth ? '' : 'opacity-40'}`
          }`}
          dateTime={day.date}
        >
          {day.day}
        </time>

        {/* 좁은 화면: 점으로 일정 수만 */}
        {items.length > 0 ? (
          <span aria-hidden="true" className="flex flex-wrap gap-0.5 sm:hidden">
            {items.slice(0, 4).map((item) => (
              <span
                className={`size-1.5 rounded-full ${DOT_CLASS_NAMES[item.kind]}`}
                key={`${item.kind}-${item.id}`}
              />
            ))}
          </span>
        ) : null}

        {/* 넓은 화면: 시각(미팅)과 미팅 제목·매물 이름 */}
        <span aria-hidden="true" className="hidden w-full min-w-0 flex-col gap-0.5 sm:flex">
          {items.slice(0, MAX_CHIPS_PER_DAY).map((item) => (
            <span
              className={`truncate px-1.5 py-0.5 text-[11px] leading-4 ${CHIP_CLASS_NAMES[item.kind]}`}
              key={`${item.kind}-${item.id}`}
            >
              <span className="tabular-nums">{getTime(item) ?? KIND_LABELS[item.kind]}</span>{' '}
              {getName(item)}
            </span>
          ))}
          {hidden > 0 ? (
            <span className="px-1.5 text-[11px] text-[var(--muted)]">+{hidden}건</span>
          ) : null}
        </span>
      </button>
    </td>
  );
}

function CalendarLegend() {
  return (
    <ul aria-label="달력 색 안내" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {LEGEND.map(({ kind, label }) => (
        <li className="flex items-center gap-1.5" key={kind}>
          <span aria-hidden="true" className={`size-2.5 ${DOT_CLASS_NAMES[kind]}`} />
          {label}
        </li>
      ))}
      <li className="text-[var(--muted)]">진행중단 미팅과 취소된 계약은 표시하지 않음</li>
    </ul>
  );
}

function DaySchedule({ date, state }: { date: string; state: LoadState }) {
  const items = state.kind === 'loaded' ? (state.byDate.get(date) ?? []) : [];

  return (
    <section aria-live="polite" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {formatDayHeading(date)}
        {state.kind === 'loaded' ? (
          <span className="ml-2 font-normal text-[var(--muted)]">일정 {items.length}건</span>
        ) : null}
      </h3>
      {state.kind === 'loaded' && items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">이날은 일정이 없습니다.</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
          {items.map((item) => (
            <li
              className="border-b border-[var(--line)] last:border-b-0"
              key={`${item.kind}-${item.id}`}
            >
              <Link
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--background)]"
                href={getHref(item)}
              >
                <span className="flex w-12 shrink-0 flex-col">
                  <span className="font-medium tabular-nums">{getTime(item) ?? '종일'}</span>
                  <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    <span aria-hidden="true" className={`size-2 ${DOT_CLASS_NAMES[item.kind]}`} />
                    {KIND_LABELS[item.kind]}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{getName(item)}</span>
                  <span className="truncate text-xs text-[var(--muted)]">
                    {item.customerName} · 케이스 {item.caseCode}
                    {item.kind === 'balance' ? ` · 잔금 ${formatManwon(item.balance)}` : null}
                  </span>
                </span>
                <KkiruStatusBadge label={getStatusLabel(item)} status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// 끼루 일정 달력. 보고 있는 달은 주소(?month=2026-11)에 남겨 새로고침해도 유지한다.
// 미팅은 미팅 일시, 계약은 계약일, 잔금은 잔금일 칸에 표시하고, 날짜를 누르면 아래에 그날 일정을 보여 준다.
export function KkiruScheduleCalendar() {
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
    listKkiruSchedule(rangeFrom, rangeTo)
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
    <section aria-label="일정 달력" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 aria-live="polite" className="text-lg font-semibold tabular-nums">
          {current.year}년 {current.month}월
        </h2>
        <div className="flex gap-1.5">
          <button
            className={NAV_BUTTON_CLASS_NAME}
            onClick={() => goTo(addMonths(current, -1))}
            type="button"
          >
            이전
          </button>
          <button
            className={`${NAV_BUTTON_CLASS_NAME} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={isThisMonth}
            onClick={() => goTo(thisMonth)}
            type="button"
          >
            오늘
          </button>
          <button
            className={NAV_BUTTON_CLASS_NAME}
            onClick={() => goTo(addMonths(current, 1))}
            type="button"
          >
            다음
          </button>
        </div>
      </div>

      <CalendarLegend />

      {state.kind === 'error' ? (
        <div
          className="flex items-center justify-between gap-3 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]"
          role="alert"
        >
          일정을 불러오지 못했습니다.
          <button
            className="underline underline-offset-2"
            onClick={() => setReloadKey((key) => key + 1)}
            type="button"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">
          {current.year}년 {current.month}월 달력
        </caption>
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((label, weekday) => (
              <th
                className={`border border-[var(--line)] bg-[var(--background)] py-2 text-center text-xs font-medium text-[var(--muted)] ${weekdayTextClass(weekday)}`}
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

      <DaySchedule date={activeDate} state={state} />
    </section>
  );
}
