/** 달력에서 쓰는 연·월 (월은 1~12) */
export type YearMonth = { year: number; month: number };

/** 달력 칸 하나 */
export type CalendarDay = {
  /** YYYY-MM-DD */
  date: string;
  day: number;
  /** 0(일) ~ 6(토) */
  weekday: number;
  /** 보고 있는 달의 날짜인지. 앞뒤 달 날짜는 흐리게 보여 준다. */
  isCurrentMonth: boolean;
};

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 2026-11 같은 값을 읽는다. 형식이 틀리면 null */
export function parseYearMonth(value: string | null): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return month >= 1 && month <= 12 ? { month, year } : null;
}

export function formatYearMonthParam({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`;
}

export function addMonths({ year, month }: YearMonth, amount: number): YearMonth {
  const index = year * 12 + (month - 1) + amount;
  return { month: (index % 12) + 1, year: Math.floor(index / 12) };
}

/**
 * 월 달력 칸을 만든다. 일요일부터 시작하고, 앞뒤 달 날짜로 채워 주 단위(7칸)로 맞춘다.
 * 날짜 계산은 UTC로 해서 기기 시간대와 상관없이 같은 결과가 나온다.
 */
export function buildMonthDays({ year, month }: YearMonth): CalendarDay[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = first.getUTCDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, 1 + index - leading));

    return {
      date: toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      day: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === month - 1,
      weekday: date.getUTCDay(),
    };
  });
}

/** YYYY-MM-DD에 날짜를 더한다. */
export function addDays(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** 2026-11-24 → 11월 24일 (화) */
export function formatDayHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return `${month}월 ${day}일 (${WEEKDAY_LABELS[weekday]})`;
}
