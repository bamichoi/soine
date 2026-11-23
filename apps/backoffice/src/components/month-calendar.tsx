'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  addMonths,
  buildMonthDays,
  type CalendarDay,
  formatYearMonthParam,
  parseYearMonth,
  WEEKDAY_LABELS,
  type YearMonth,
} from '@/lib/calendar';
import { getSeoulToday } from '@/lib/choidolsang-inquiries-api';

const NAV_BUTTON_CLASS_NAME =
  'flex h-9 min-w-9 items-center justify-center border border-[var(--line)] bg-[var(--surface)] px-3 text-sm hover:bg-[var(--background)]';

function weekdayTextClass(weekday: number): string {
  if (weekday === 0) {
    return 'text-[var(--error)]';
  }

  return weekday === 6 ? 'text-[var(--brand)]' : '';
}

function DayCell({ day, isToday }: { day: CalendarDay; isToday: boolean }) {
  return (
    <td
      className={`h-20 border border-[var(--line)] p-1.5 align-top sm:h-28 sm:p-2 ${
        day.isCurrentMonth ? 'bg-[var(--surface)]' : 'bg-[var(--background)]'
      }`}
    >
      <time
        className={`flex size-6 items-center justify-center rounded-full text-xs tabular-nums sm:text-sm ${
          isToday
            ? 'bg-[var(--brand)] font-semibold text-white'
            : `${weekdayTextClass(day.weekday)} ${day.isCurrentMonth ? '' : 'opacity-40'}`
        }`}
        dateTime={day.date}
      >
        {day.day}
      </time>
      {/* 예약 기능이 생기면 이 칸에 그날 예약 일정을 표시한다. */}
    </td>
  );
}

// 월 달력. 보고 있는 달은 주소(?month=2026-11)에 남겨 새로고침해도 유지한다.
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
                <DayCell day={day} isToday={day.date === today} key={day.date} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
