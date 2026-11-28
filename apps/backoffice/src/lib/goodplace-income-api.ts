import { requestAdminApi } from '@/lib/admin-auth-api';
import { formatYearMonthParam, parseYearMonth, type YearMonth } from '@/lib/calendar';
import type { GoodplaceContractStatus } from '@/lib/goodplace-status';

export const INCOME_YEAR_MIN = 2000;
export const INCOME_YEAR_MAX = 2100;

/** 확정 = 계약완료이고 잔금일이 오늘 이전·당일, 예정 = 그 밖 */
export type GoodplaceIncomeState = 'confirmed' | 'expected';

/** 구분: 내 매물 계약만 / 내 손님 계약만 */
export type GoodplaceIncomeMine = 'listing' | 'client';

export type GoodplaceIncomeContract = {
  id: string;
  caseCode: string;
  customer: { name: string };
  listing: { name: string };
  /** 계약일 (YYYY-MM-DD) */
  contractedOn: string;
  /** 잔금일 (YYYY-MM-DD) */
  balanceDueOn: string;
  /** 수수료(만원) */
  commission: number;
  status: GoodplaceContractStatus;
  isMyListing: boolean;
  isMyClient: boolean;
  incomeState: GoodplaceIncomeState;
};

export type GoodplaceIncomeMonth = {
  /** 1 ~ 12 */
  month: number;
  confirmedAmount: number;
  expectedAmount: number;
  count: number;
};

export type GoodplaceIncome = {
  period: { kind: 'year' | 'month'; year: number; month: number | null };
  /** 서울 기준 오늘 (YYYY-MM-DD). 백엔드가 정한다. */
  today: string;
  /** 구분 필터. 합계·months·contracts에 모두 반영되어 있다. */
  mine: GoodplaceIncomeMine | null;
  confirmed: { amount: number; count: number };
  expected: { amount: number; count: number };
  /** 기간 안의 구분별 계약 건수. mine과 상관없이 전체 계약 기준 */
  counts: { all: number; listing: number; client: number };
  /** 기간이 속한 해의 월별 합(mine 반영). 월별 보기에서도 그 해 전체. 계약이 있는 달만 */
  months: GoodplaceIncomeMonth[];
  /** 잔금일순, 계약취소 제외 */
  contracts: GoodplaceIncomeContract[];
};

/** 주소로 고른 기간 */
export type GoodplaceIncomePeriod =
  | { kind: 'year'; year: number }
  | ({ kind: 'month' } & YearMonth);

/** 주소에 남기는 수입 화면 조건 */
export type GoodplaceIncomeQuery = {
  /** null = 기본(이번 달 월별) */
  period: GoodplaceIncomePeriod | null;
  mine: GoodplaceIncomeMine | null;
  state: GoodplaceIncomeState | null;
};

function isYearInRange(year: number): boolean {
  return Number.isInteger(year) && year >= INCOME_YEAR_MIN && year <= INCOME_YEAR_MAX;
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function parsePeriod(params: URLSearchParams): GoodplaceIncomePeriod | null {
  const yearText = params.get('year');
  const monthText = params.get('month');

  if (yearText !== null && monthText === null) {
    const year = Number(yearText);
    return /^\d{4}$/.test(yearText) && isYearInRange(year) ? { kind: 'year', year } : null;
  }

  if (monthText !== null && yearText === null) {
    const yearMonth = parseYearMonth(monthText);
    return yearMonth && isYearInRange(yearMonth.year) ? { kind: 'month', ...yearMonth } : null;
  }

  return null;
}

/**
 * 주소 값을 읽는다. 잘못된 값은 기본값으로 본다.
 * year·month를 함께 주면 기간은 기본(이번 달)이다.
 */
export function parseIncomeSearchParams(params: URLSearchParams): GoodplaceIncomeQuery {
  return {
    mine: pick(params.get('mine'), ['listing', 'client'] as const),
    period: parsePeriod(params),
    state: pick(params.get('state'), ['confirmed', 'expected'] as const),
  };
}

export function isSameIncomePeriod(a: GoodplaceIncomePeriod, b: GoodplaceIncomePeriod): boolean {
  if (a.kind === 'year' || b.kind === 'year') {
    return a.kind === b.kind && a.year === b.year;
  }

  return a.year === b.year && a.month === b.month;
}

/**
 * 조건을 주소 쿼리로. 기본인 이번 달 월별은 생략한다.
 * thisMonth를 아직 모르면(null) 월별 기간을 늘 남긴다.
 */
export function buildIncomeSearch(
  query: GoodplaceIncomeQuery,
  thisMonth: YearMonth | null,
): string {
  const params = new URLSearchParams();
  const { period, mine, state } = query;

  if (period?.kind === 'year') {
    params.set('year', String(period.year));
  } else if (
    period &&
    (thisMonth === null || !isSameIncomePeriod(period, { kind: 'month', ...thisMonth }))
  ) {
    params.set('month', formatYearMonthParam(period));
  }

  if (mine) {
    params.set('mine', mine);
  }

  if (state) {
    params.set('state', state);
  }

  const text = params.toString();
  return text ? `?${text}` : '';
}

/** 잔금일 기준 수입. 기간을 주지 않으면 백엔드가 이번 달로 정한다. 구분은 백엔드가 거른다. */
export async function getGoodplaceIncome(
  period: GoodplaceIncomePeriod | null,
  mine: GoodplaceIncomeMine | null,
): Promise<GoodplaceIncome> {
  const params = new URLSearchParams();

  if (period?.kind === 'year') {
    params.set('year', String(period.year));
  } else if (period?.kind === 'month') {
    params.set('month', formatYearMonthParam(period));
  }

  if (mine) {
    params.set('mine', mine);
  }

  const text = params.toString();
  const response = await requestAdminApi(`goodplace/income${text ? `?${text}` : ''}`);
  return (await response.json()) as GoodplaceIncome;
}

// ---------------------------------------------------------------- 화면용 계산

/** 흐름 막대 한 칸. 계약이 없는 달은 금액 0 */
export type IncomeBar = { month: number; confirmedAmount: number; expectedAmount: number };

/** 그 해 1~12월 막대. 응답의 months는 계약이 있는 달만이므로 빈 달을 0으로 채운다. */
export function buildIncomeBars(income: GoodplaceIncome): IncomeBar[] {
  const byMonth = new Map(income.months.map((month) => [month.month, month]));

  return Array.from({ length: 12 }, (_, index) => {
    const data = byMonth.get(index + 1);
    return {
      confirmedAmount: data?.confirmedAmount ?? 0,
      expectedAmount: data?.expectedAmount ?? 0,
      month: index + 1,
    };
  });
}

/** 연간 목록의 한 달. 상태 필터를 고르면 그 상태의 금액·건수만 센다. */
export type IncomeYearMonthCard = {
  month: number;
  count: number;
  confirmedAmount: number;
  expectedAmount: number;
};

/** 연간 목록: 계약이 있는 달만, 1월부터. 상태 필터에 맞는 계약이 없는 달은 뺀다. */
export function buildYearMonthCards(
  contracts: GoodplaceIncomeContract[],
  state: GoodplaceIncomeState | null,
): IncomeYearMonthCard[] {
  const byMonth = new Map<number, IncomeYearMonthCard>();

  for (const contract of contracts) {
    if (state && contract.incomeState !== state) {
      continue;
    }

    const month = Number(contract.balanceDueOn.slice(5, 7));
    const card = byMonth.get(month) ?? { confirmedAmount: 0, count: 0, expectedAmount: 0, month };
    card.count += 1;

    if (contract.incomeState === 'confirmed') {
      card.confirmedAmount += contract.commission;
    } else {
      card.expectedAmount += contract.commission;
    }

    byMonth.set(month, card);
  }

  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}
