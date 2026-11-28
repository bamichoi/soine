'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  IncomeContractList,
  IncomeError,
  IncomeFilters,
  IncomeHead,
  IncomeHero,
  IncomeNotice,
  IncomeYearList,
} from '@/components/goodplace-income-parts';
import { addMonths, type YearMonth } from '@/lib/calendar';
import {
  buildIncomeBars,
  buildIncomeSearch,
  buildYearMonthCards,
  type GoodplaceIncome,
  type GoodplaceIncomeMine,
  type GoodplaceIncomePeriod,
  type GoodplaceIncomeQuery,
  getGoodplaceIncome,
  INCOME_YEAR_MAX,
  INCOME_YEAR_MIN,
  parseIncomeSearchParams,
} from '@/lib/goodplace-income-api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; key: string; income: GoodplaceIncome };

/** 서울 기준 오늘 (YYYY-MM-DD). 첫 응답 전에만 쓰고, 응답이 오면 백엔드의 today를 따른다. */
function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function toYearMonth(date: string): YearMonth {
  return { month: Number(date.slice(5, 7)), year: Number(date.slice(0, 4)) };
}

function formatPeriod(period: GoodplaceIncomePeriod): string {
  return period.kind === 'year' ? `${period.year}년` : `${period.year}년 ${period.month}월`;
}

/** 첫 카드·목록 제목에 쓰는 짧은 기간 이름: 월별 '11월', 연간 '2026년' */
function shortPeriod(period: GoodplaceIncomePeriod): string {
  return period.kind === 'year' ? `${period.year}년` : `${period.month}월`;
}

function isYearInRange(year: number): boolean {
  return year >= INCOME_YEAR_MIN && year <= INCOME_YEAR_MAX;
}

/** 앞뒤 기간. 2000~2100년 밖이면 null */
function shiftPeriod(period: GoodplaceIncomePeriod, amount: number): GoodplaceIncomePeriod | null {
  if (period.kind === 'year') {
    const year = period.year + amount;
    return isYearInRange(year) ? { kind: 'year', year } : null;
  }

  const next = addMonths(period, amount);
  return isYearInRange(next.year) ? { kind: 'month', ...next } : null;
}

function loadKeyOf(period: GoodplaceIncomePeriod | null, mine: GoodplaceIncomeMine | null): string {
  const periodText =
    period === null
      ? 'default'
      : period.kind === 'year'
        ? `y${period.year}`
        : `m${period.year}-${period.month}`;
  return `${periodText}|${mine ?? ''}`;
}

type IncomeBodyProps = {
  income: GoodplaceIncome;
  period: GoodplaceIncomePeriod;
  query: GoodplaceIncomeQuery;
  monthHref: (month: number) => string;
  onQueryChange: (next: Partial<GoodplaceIncomeQuery>) => void;
};

/** 불러온 뒤: 첫 카드(합계·흐름) → 목록 머리(칩) → 목록 */
function IncomeBody({ income, period, query, monthHref, onQueryChange }: IncomeBodyProps) {
  const short = shortPeriod(period);
  // 상태 필터는 목록만 거른다. 합계·막대·칩 건수는 기간·구분 기준 그대로다.
  const contracts = query.state
    ? income.contracts.filter((contract) => contract.incomeState === query.state)
    : income.contracts;
  const yearCards =
    period.kind === 'year' ? buildYearMonthCards(income.contracts, query.state) : [];

  function emptyText(): string | null {
    if (contracts.length > 0) {
      return null;
    }

    return income.counts.all === 0
      ? `${formatPeriod(period)}에 잔금일인 계약이 없습니다.`
      : '조건에 맞는 계약이 없습니다.';
  }

  const empty = emptyText();

  return (
    <>
      <IncomeHero
        bars={buildIncomeBars(income)}
        confirmed={income.confirmed}
        currentMonth={period.kind === 'month' ? period.month : null}
        expected={income.expected}
        label={`${short} 수입`}
        monthHref={monthHref}
        year={period.year}
      />
      <IncomeFilters
        count={contracts.length}
        counts={income.counts}
        mine={query.mine}
        onMineChange={(mine) => onQueryChange({ mine })}
        onStateChange={(state) => onQueryChange({ state })}
        state={query.state}
        title={`${short} 계약`}
      />
      {empty ? (
        <IncomeNotice text={empty} />
      ) : period.kind === 'year' ? (
        <IncomeYearList
          cards={yearCards}
          monthHref={monthHref}
          state={query.state}
          year={period.year}
        />
      ) : (
        <IncomeContractList contracts={contracts} />
      )}
    </>
  );
}

// 굿플레이스 수입 (시안 A). 잔금일 기준으로 계약 수수료를 확정·예정으로 나눠 보여 준다.
// 기간(?month=, ?year=), 구분(&mine=), 상태(&state=)는 주소에 남긴다. 기간을 바꿔도 구분·상태는 유지한다.
// 기본인 이번 달 월별은 주소에서 생략한다. 오늘 날짜는 백엔드 응답(today)을 따른다.
export function GoodplaceIncomeView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = parseIncomeSearchParams(searchParams);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  // 마지막 응답의 오늘. 첫 응답 전에는 브라우저 시계(서울)로 대신한다.
  const [today, setToday] = useState<string>(seoulToday);
  const loadKey = loadKeyOf(query.period, query.mine);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadKey가 기간·구분을 대신한다.
  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 조건을 다시 불러오기 위한 값이다.
    void reloadKey;
    getGoodplaceIncome(query.period, query.mine)
      .then((income) => {
        if (isActive) {
          setToday(income.today);
          setState({ income, key: loadKey, kind: 'loaded' });
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
  }, [loadKey, reloadKey]);

  const thisMonth = toYearMonth(today);
  const period: GoodplaceIncomePeriod = query.period ?? { kind: 'month', ...thisMonth };
  // 주소가 바뀐 직후 새로 불러오기 전에는 이전 조건의 응답이 남아 있으므로 쓰지 않는다.
  const income = state.kind === 'loaded' && state.key === loadKey ? state.income : null;

  function searchFor(next: Partial<GoodplaceIncomeQuery>): string {
    return buildIncomeSearch({ ...query, period, ...next }, thisMonth);
  }

  function update(next: Partial<GoodplaceIncomeQuery>) {
    router.replace(`${pathname}${searchFor(next)}`, { scroll: false });
  }

  // 월별 → 연간: 그 달의 해. 연간 → 월별: 올해면 이번 달, 다른 해면 1월.
  function handleKindChange(kind: GoodplaceIncomePeriod['kind']) {
    if (kind === period.kind) {
      return;
    }

    if (kind === 'year') {
      update({ period: { kind: 'year', year: period.year } });
    } else {
      const month = period.year === thisMonth.year ? thisMonth.month : 1;
      update({ period: { kind: 'month', month, year: period.year } });
    }
  }

  function moveTo(amount: number) {
    const next = shiftPeriod(period, amount);
    return next ? () => update({ period: next }) : null;
  }

  const unit = period.kind === 'year' ? '해' : '달';

  return (
    <section aria-label="수입">
      <IncomeHead
        kind={period.kind}
        label={formatPeriod(period)}
        next={{ label: `다음 ${unit}`, onClick: moveTo(1) }}
        onKindChange={handleKindChange}
        previous={{ label: `이전 ${unit}`, onClick: moveTo(-1) }}
      />

      {state.kind === 'error' ? (
        <IncomeError onRetry={() => setReloadKey((key) => key + 1)} />
      ) : income ? (
        <IncomeBody
          income={income}
          monthHref={(month) =>
            `${pathname}${searchFor({ period: { kind: 'month', month, year: period.year } })}`
          }
          onQueryChange={update}
          period={period}
          query={query}
        />
      ) : (
        <IncomeNotice text="불러오고 있습니다." />
      )}
    </section>
  );
}
