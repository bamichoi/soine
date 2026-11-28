'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorNotice, GroupHead, Notice, PageHead, PeriodNav } from '@/components/page-parts';
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
import {
  FAINT_CLASS_NAME,
  FOCUS_CLASS_NAME,
  ROW_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

/** 넓은 화면에서 한 칸에 보여 줄 예약 수. 넘치면 +N으로 줄인다. */
const MAX_CHIPS_PER_DAY = 2;

const CHIP_CLASS_NAMES: Record<ReservationStatus, string> = {
  cancelled: 'bg-[var(--background)] text-[var(--muted)]',
  completed: 'bg-[var(--success-soft)] text-[var(--success)]',
  reserved: 'bg-[var(--brand-soft)] text-[var(--brand)]',
};

/** 아래 목록 왼쪽 52px 배지 색 */
const BADGE_CLASS_NAMES: Record<ReservationStatus, string> = {
  cancelled: 'bg-[var(--background)] text-[var(--muted)]',
  completed: 'bg-[var(--success-soft)] text-[var(--success)]',
  reserved: 'bg-[var(--brand-soft)] text-[var(--brand-strong)]',
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

/** 일요일 빨강, 토요일 파랑, 나머지는 fallback */
function weekdayTextClass(weekday: number, fallback = ''): string {
  if (weekday === 0) {
    return 'text-[var(--error)]';
  }

  return weekday === 6 ? 'text-[var(--brand)]' : fallback;
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

function chipClassName(item: ReservationCalendarItem, isSelected: boolean): string {
  // 고른 날(연한 파랑 바탕)에서는 예약중 칩이 묻히지 않게 흰 바탕으로 둔다.
  return isSelected && item.status === 'reserved'
    ? 'bg-[var(--surface)] text-[var(--brand)]'
    : CHIP_CLASS_NAMES[item.status];
}

function DayCell({ day, isToday, isSelected, reservations, onSelect }: DayCellProps) {
  const hidden = reservations.length - MAX_CHIPS_PER_DAY;
  const otherMonth = day.isCurrentMonth ? '' : 'opacity-40';

  return (
    <td className="p-0 align-top">
      <button
        aria-label={`${formatDayHeading(day.date)} 예약 ${reservations.length}건`}
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

        {/* 좁은 화면: 점으로 예약 수만 */}
        {reservations.length > 0 ? (
          <span aria-hidden="true" className={`flex flex-wrap gap-0.5 sm:hidden ${otherMonth}`}>
            {reservations.slice(0, 4).map((item) => (
              <span
                className={`size-1.5 rounded-full ${DOT_CLASS_NAMES[item.status]}`}
                key={item.code}
              />
            ))}
          </span>
        ) : null}

        {/* 넓은 화면: 시간과 장소 */}
        <span
          aria-hidden="true"
          className={`hidden w-full min-w-0 flex-col gap-0.5 sm:flex ${otherMonth}`}
        >
          {reservations.slice(0, MAX_CHIPS_PER_DAY).map((item) => (
            <span
              className={`truncate rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold ${chipClassName(item, isSelected)}`}
              key={item.code}
            >
              <span className="tabular-nums">{getEventTime(item)}</span> {item.eventLocation}
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

// 달력 칸 색이 뜻하는 예약 상태. 취소환불 예약은 달력에 표시하지 않는다.
const LEGEND: { status: ReservationStatus; label: string }[] = [
  { label: '예약중', status: 'reserved' },
  { label: '완료', status: 'completed' },
];

function CalendarTop() {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <ul
        aria-label="달력 색 안내"
        className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs font-semibold text-[var(--muted)]"
      >
        {LEGEND.map((entry) => (
          <li className="inline-flex items-center gap-1.5" key={entry.status}>
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${DOT_CLASS_NAMES[entry.status]}`}
            />
            {entry.label}
          </li>
        ))}
      </ul>
      <p className={`text-xs ${FAINT_CLASS_NAME}`}>취소환불은 표시하지 않음</p>
    </div>
  );
}

function ReservationRow({ item }: { item: ReservationCalendarItem }) {
  return (
    <li>
      <Link
        className={`${ROW_CLASS_NAME} grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[56px_minmax(0,1fr)_auto] md:gap-[18px]`}
        href={`/choidolsang/reservations/${item.code}`}
      >
        <span
          className={`flex size-[52px] flex-col items-center justify-center rounded-2xl leading-[1.15] ${BADGE_CLASS_NAMES[item.status]}`}
        >
          <b className="text-[15px] font-extrabold tabular-nums">{getEventTime(item)}</b>
          <span className="text-[11px] font-bold">예약</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold">{item.eventLocation}</span>
          <span className="mt-0.5 block truncate text-sm text-[var(--muted)]">
            {item.conceptName} · {item.customerName}
          </span>
        </span>
        <ReservationStatusBadge status={item.status} />
      </Link>
    </li>
  );
}

function DayReservations({ date, state }: { date: string; state: LoadState }) {
  const reservations = state.kind === 'loaded' ? (state.byDate.get(date) ?? []) : [];

  return (
    <section aria-label={`${formatDayHeading(date)} 예약`} aria-live="polite">
      <GroupHead
        count={state.kind === 'loaded' ? `${reservations.length.toLocaleString('ko-KR')}건` : null}
        title={`${formatDayHeading(date)} 예약`}
      />
      {state.kind === 'loading' ? <Notice text="불러오고 있습니다." /> : null}
      {state.kind === 'loaded' && reservations.length === 0 ? (
        <Notice text="이날은 예약이 없습니다." />
      ) : null}
      {reservations.length > 0 ? (
        <ul className="grid gap-2">
          {reservations.map((item) => (
            <ReservationRow item={item} key={item.code} />
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
    <div>
      {/* 오늘을 고른 상태일 때만 '오늘'을 누를 수 없다. */}
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
            text="예약 일정을 불러오지 못했습니다."
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
                    key={day.date}
                    onSelect={setSelectedDate}
                    reservations={state.kind === 'loaded' ? (state.byDate.get(day.date) ?? []) : []}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <DayReservations date={activeDate} state={state} />
    </div>
  );
}
