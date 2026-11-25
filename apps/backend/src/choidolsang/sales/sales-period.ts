/** 매출 집계 기간. 시작은 포함, 끝은 미포함이며 한국 시간 자정 기준이다. */
export type SalesPeriod = {
  kind: 'month' | 'year';
  /** 2026-11 또는 2026 */
  key: string;
  start: Date;
  end: Date;
};

type YearMonth = { year: number; month: number };

function shiftMonth({ year, month }: YearMonth, amount: number): YearMonth {
  const index = year * 12 + (month - 1) + amount;
  return { month: (index % 12) + 1, year: Math.floor(index / 12) };
}

function monthKey({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** 한국 시간으로 그 달 1일 0시 */
function monthStart(yearMonth: YearMonth): Date {
  return new Date(`${monthKey(yearMonth)}-01T00:00:00+09:00`);
}

function parseMonth(key: string): YearMonth {
  const [year, month] = key.split('-').map(Number);
  return { month, year };
}

export function monthPeriod(key: string): SalesPeriod {
  const yearMonth = parseMonth(key);
  return {
    end: monthStart(shiftMonth(yearMonth, 1)),
    key,
    kind: 'month',
    start: monthStart(yearMonth),
  };
}

export function yearPeriod(year: number): SalesPeriod {
  return {
    end: monthStart({ month: 1, year: year + 1 }),
    key: String(year),
    kind: 'year',
    start: monthStart({ month: 1, year }),
  };
}

/** 바로 앞 기간 (지난달 또는 지난해) */
export function previousPeriod(period: SalesPeriod): SalesPeriod {
  return period.kind === 'month'
    ? monthPeriod(monthKey(shiftMonth(parseMonth(period.key), -1)))
    : yearPeriod(Number(period.key) - 1);
}

/**
 * 추이 그래프에 쓸 12개 달.
 * 월 보기는 그 달까지 최근 12개월, 연 보기는 그해 1~12월.
 */
export function trendMonths(period: SalesPeriod): string[] {
  const last =
    period.kind === 'month' ? parseMonth(period.key) : { month: 12, year: Number(period.key) };

  return Array.from({ length: 12 }, (_, index) => monthKey(shiftMonth(last, index - 11)));
}

/** 시각이 한국 시간으로 몇 년 몇 월인지 (YYYY-MM) */
export function toSeoulMonthKey(date: Date): string {
  const seoul = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${seoul.getUTCFullYear()}-${String(seoul.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(keys: string[]): { start: Date; end: Date } {
  return { end: monthPeriod(keys[keys.length - 1]).end, start: monthPeriod(keys[0]).start };
}
