'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { SalesConceptTable } from '@/components/sales-concept-table';
import { SalesItemsTable } from '@/components/sales-items-table';
import { SalesTrendChart } from '@/components/sales-trend-chart';
import { addMonths, formatYearMonthParam, parseYearMonth, type YearMonth } from '@/lib/calendar';
import { getSeoulToday } from '@/lib/choidolsang-inquiries-api';
import { getSalesSummary, type SalesPeriod, type SalesSummary } from '@/lib/choidolsang-sales-api';
import { formatWon } from '@/lib/money';

const NAV_BUTTON_CLASS_NAME =
  'flex h-9 min-w-9 items-center justify-center border border-[var(--line)] bg-[var(--surface)] px-3 text-sm hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; summary: SalesSummary };

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

// 주소의 ?month=2026-11 또는 ?year=2026을 읽는다. 없으면 이번 달.
function readPeriod(params: URLSearchParams, thisMonth: YearMonth): SalesPeriod {
  const year = params.get('year');

  if (year && /^\d{4}$/.test(year)) {
    return { key: year, kind: 'year' };
  }

  return {
    key: formatYearMonthParam(parseYearMonth(params.get('month')) ?? thisMonth),
    kind: 'month',
  };
}

function periodTitle(period: SalesPeriod): string {
  if (period.kind === 'year') {
    return `${period.key}년`;
  }

  const [year, month] = period.key.split('-').map(Number);
  return `${year}년 ${month}월`;
}

function shiftPeriod(period: SalesPeriod, amount: number): SalesPeriod {
  if (period.kind === 'year') {
    return { key: String(Number(period.key) + amount), kind: 'year' };
  }

  return {
    key: formatYearMonthParam(addMonths(parseYearMonth(period.key) as YearMonth, amount)),
    kind: 'month',
  };
}

function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="truncate text-lg font-semibold tabular-nums">{value}</span>
      {sub ? <span className="text-xs text-[var(--muted)]">{sub}</span> : null}
    </div>
  );
}

// 앞 기간 대비 증감. 색만으로 뜻을 전하지 않도록 ▲▼ 기호와 글을 함께 쓴다.
function ChangeText({ summary }: { summary: SalesSummary }) {
  const previousLabel = summary.period.kind === 'month' ? '지난달' : '지난해';

  if (summary.changeRate === null) {
    return <>{previousLabel} 매출 없음</>;
  }

  if (summary.changeRate === 0) {
    return <>{previousLabel}과 같음</>;
  }

  const isUp = summary.changeRate > 0;

  return (
    <span className={isUp ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
      {previousLabel}보다 {isUp ? '▲' : '▼'} {Math.abs(summary.changeRate)}%
    </span>
  );
}

function SummaryTiles({ summary }: { summary: SalesSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <StatTile
        label="매출"
        sub={<ChangeText summary={summary} />}
        value={formatWon(summary.totalAmount)}
      />
      <StatTile label="완료 건수" value={`${summary.count.toLocaleString()}건`} />
      <StatTile label="건당 평균" value={formatWon(summary.averageAmount)} />
      <StatTile
        label="예정 매출"
        sub={`예약중 ${summary.expected.count}건 · 이 기간 행사`}
        value={
          <span className="text-[var(--muted)]">{formatWon(summary.expected.totalAmount)}</span>
        }
      />
    </div>
  );
}

// 매출 화면. 업무 완료를 누른 날(한국 날짜) 기준으로 모은다. 취소환불은 아직 넣지 않는다.
export function ChoidolsangSalesDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const thisMonth = parseYearMonth(getSeoulToday().slice(0, 7)) as YearMonth;
  const period = readPeriod(new URLSearchParams(searchParams.toString()), thisMonth);
  const page = parsePage(searchParams.get('page'));
  const isCurrent =
    period.kind === 'month'
      ? period.key === formatYearMonthParam(thisMonth)
      : period.key === String(thisMonth.year);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const periodKey = `${period.kind}:${period.key}`;

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });
    const [kind, key] = periodKey.split(':') as [SalesPeriod['kind'], string];

    // reloadKey는 '다시 시도'로 같은 기간을 다시 불러오기 위한 값이다.
    void reloadKey;
    getSalesSummary({ key, kind })
      .then((summary) => {
        if (isActive) {
          setState({ kind: 'loaded', summary });
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
  }, [periodKey, reloadKey]);

  function goTo(next: SalesPeriod, nextPage = 1) {
    const params = new URLSearchParams();
    const isThisMonth = next.kind === 'month' && next.key === formatYearMonthParam(thisMonth);

    if (!isThisMonth) {
      params.set(next.kind, next.key);
    }

    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <section aria-label="매출" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 aria-live="polite" className="text-lg font-semibold tabular-nums">
            {periodTitle(period)} 매출
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <div className="flex">
              {(['month', 'year'] as const).map((kind) => (
                <button
                  aria-pressed={period.kind === kind}
                  className={`h-9 border px-3 text-sm ${
                    period.kind === kind
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                      : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--background)]'
                  }`}
                  key={kind}
                  onClick={() =>
                    goTo(
                      kind === 'month'
                        ? { key: formatYearMonthParam(thisMonth), kind: 'month' }
                        : { key: period.key.slice(0, 4), kind: 'year' },
                    )
                  }
                  type="button"
                >
                  {kind === 'month' ? '월별' : '연간'}
                </button>
              ))}
            </div>
            <button
              className={NAV_BUTTON_CLASS_NAME}
              onClick={() => goTo(shiftPeriod(period, -1))}
              type="button"
            >
              이전
            </button>
            <button
              className={NAV_BUTTON_CLASS_NAME}
              disabled={isCurrent}
              onClick={() =>
                goTo(
                  period.kind === 'month'
                    ? { key: formatYearMonthParam(thisMonth), kind: 'month' }
                    : { key: String(thisMonth.year), kind: 'year' },
                )
              }
              type="button"
            >
              {period.kind === 'month' ? '이번 달' : '올해'}
            </button>
            <button
              className={NAV_BUTTON_CLASS_NAME}
              onClick={() => goTo(shiftPeriod(period, 1))}
              type="button"
            >
              다음
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          업무 완료를 누른 날 기준입니다. 취소환불된 예약은 아직 매출에 넣지 않습니다.
        </p>
      </div>

      {state.kind === 'loading' ? (
        <p className="py-10 text-sm text-[var(--muted)]">매출을 불러오고 있습니다.</p>
      ) : null}
      {state.kind === 'error' ? (
        <div
          className="flex items-center justify-between gap-3 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]"
          role="alert"
        >
          매출을 불러오지 못했습니다.
          <button
            className="underline underline-offset-2"
            onClick={() => setReloadKey((key) => key + 1)}
            type="button"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {state.kind === 'loaded' ? (
        <>
          <SummaryTiles summary={state.summary} />
          <div className="border border-[var(--line)] bg-[var(--surface)] px-4 pt-4 pb-3">
            <SalesTrendChart
              onSelectMonth={(month) => goTo({ key: month, kind: 'month' })}
              selectedMonth={period.kind === 'month' ? period.key : null}
              trend={state.summary.trend}
            />
          </div>
          <SalesConceptTable rows={state.summary.byConcept} />
        </>
      ) : null}

      <SalesItemsTable
        onPageChange={(nextPage) => goTo(period, nextPage)}
        page={page}
        period={period}
      />
    </section>
  );
}
