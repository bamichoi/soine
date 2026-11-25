'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ReservationStatusBadge } from '@/components/reservation-status-badge';
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
import {
  listCalendarReservations,
  type ReservationCalendarItem,
  type ReservationStatus,
} from '@/lib/choidolsang-reservations-api';

const NAV_BUTTON_CLASS_NAME =
  'flex h-9 min-w-9 items-center justify-center border border-[var(--line)] bg-[var(--surface)] px-3 text-sm hover:bg-[var(--background)]';

/** 넓은 화면에서 한 칸에 보여 줄 예약 수. 넘치면 +N으로 줄인다. */
const MAX_CHIPS_PER_DAY = 2;

const CHIP_CLASS_NAMES: Record<ReservationStatus, string> = {
  cancelled: 'bg-[var(--background)] text-[var(--muted)]',
  completed: 'bg-[var(--success-soft)] text-[var(--success)]',
  reserved: 'bg-[var(--brand-soft)] text-[var(--brand)]',
};

const DOT_CLASS_NAMES: Record<ReservationStatus, string> = {
  cancelled: 'bg-[var(--muted)]',
  completed: 'bg-[var(--success)]',
  reserved: 'bg-[var(--brand)]',
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; byDate: Map<string, ReservationCalendarItem[]> };

function weekdayTextClass(weekday: number): string {
  if (weekday === 0) {
    return 'text-[var(--error)]';
  }

  return weekday === 6 ? 'text-[var(--brand)]' : '';
}

function getEventTime(item: ReservationCalendarItem): string {
  return toSeoulDateAndTime(item.eventAt).time;
}

// 예약을 한국 날짜별로 묶는다.
function groupByDate(items: ReservationCalendarItem[]): Map<string, ReservationCalendarItem[]> {
  const byDate = new Map<string, ReservationCalendarItem[]>();

  for (const item of items) {
    const date = toSeoulDateAndTime(item.eventAt).date;
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  }

  return byDate;
}

type DayCellProps = {
  day: CalendarDay;
  isToday: boolean;
  isSelected: boolean;
  reservations: ReservationCalendarItem[];
  onSelect: (date: string) => void;
};

function DayCell({ day, isToday, isSelected, reservations, onSelect }: DayCellProps) {
  const hidden = reservations.length - MAX_CHIPS_PER_DAY;

  return (
    <td
      className={`h-20 border border-[var(--line)] p-0 align-top sm:h-28 ${
        day.isCurrentMonth ? 'bg-[var(--surface)]' : 'bg-[var(--background)]'
      }`}
    >
      <button
        aria-label={`${formatDayHeading(day.date)} 예약 ${reservations.length}건`}
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

        {/* 좁은 화면: 점으로 예약 수만 */}
        {reservations.length > 0 ? (
          <span aria-hidden="true" className="flex flex-wrap gap-0.5 sm:hidden">
            {reservations.slice(0, 4).map((item) => (
              <span
                className={`size-1.5 rounded-full ${DOT_CLASS_NAMES[item.status]}`}
                key={item.code}
              />
            ))}
          </span>
        ) : null}

        {/* 넓은 화면: 시간과 장소 */}
        <span aria-hidden="true" className="hidden w-full min-w-0 flex-col gap-0.5 sm:flex">
          {reservations.slice(0, MAX_CHIPS_PER_DAY).map((item) => (
            <span
              className={`truncate px-1.5 py-0.5 text-[11px] leading-4 ${CHIP_CLASS_NAMES[item.status]}`}
              key={item.code}
            >
              <span className="tabular-nums">{getEventTime(item)}</span> {item.eventLocation}
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

// 달력 칸 색이 뜻하는 예약 상태. 취소환불 예약은 달력에 표시하지 않는다.
const LEGEND: { status: ReservationStatus; label: string }[] = [
  { label: '예약중', status: 'reserved' },
  { label: '완료', status: 'completed' },
];

function CalendarLegend() {
  return (
    <ul aria-label="달력 색 안내" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {LEGEND.map((entry) => (
        <li className="flex items-center gap-1.5" key={entry.status}>
          <span aria-hidden="true" className={`size-2.5 ${DOT_CLASS_NAMES[entry.status]}`} />
          {entry.label}
        </li>
      ))}
      <li className="text-[var(--muted)]">취소환불은 표시하지 않음</li>
    </ul>
  );
}

function DayReservations({ date, state }: { date: string; state: LoadState }) {
  const reservations = state.kind === 'loaded' ? (state.byDate.get(date) ?? []) : [];

  return (
    <section aria-live="polite" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        {formatDayHeading(date)}
        {state.kind === 'loaded' ? (
          <span className="ml-2 font-normal text-[var(--muted)]">예약 {reservations.length}건</span>
        ) : null}
      </h3>
      {state.kind === 'loaded' && reservations.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">이날은 예약이 없습니다.</p>
      ) : null}
      {reservations.length > 0 ? (
        <ul className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
          {reservations.map((item) => (
            <li className="border-b border-[var(--line)] last:border-b-0" key={item.code}>
              <Link
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--background)]"
                href={`/choidolsang/reservations/${item.code}`}
              >
                <span className="w-12 shrink-0 font-medium tabular-nums">{getEventTime(item)}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{item.eventLocation}</span>
                  <span className="truncate text-xs text-[var(--muted)]">
                    {item.conceptName} · {item.customerName}
                  </span>
                </span>
                <ReservationStatusBadge status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// 월 달력. 보고 있는 달은 주소(?month=2026-11)에 남겨 새로고침해도 유지한다.
// 예약중·완료 예약을 행사 날짜 칸에 표시하고, 날짜를 누르면 아래에 그날 예약 목록을 보여 준다.
export function MonthCalendar() {
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
  const activeDate =
    selectedDate?.startsWith(monthPrefix) === true
      ? selectedDate
      : isThisMonth
        ? today
        : `${monthPrefix}-01`;

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 기간을 다시 불러오기 위한 값이다.
    void reloadKey;
    listCalendarReservations(rangeFrom, rangeTo)
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
          예약 일정을 불러오지 못했습니다.
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
                  key={day.date}
                  onSelect={setSelectedDate}
                  reservations={state.kind === 'loaded' ? (state.byDate.get(day.date) ?? []) : []}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <DayReservations date={activeDate} state={state} />
    </section>
  );
}
