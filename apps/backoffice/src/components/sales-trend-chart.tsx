'use client';

import { useState } from 'react';
import type { SalesSummary } from '@/lib/choidolsang-sales-api';
import { formatWon } from '@/lib/money';

type SalesTrendChartProps = {
  trend: SalesSummary['trend'];
  /** 강조할 달(월 보기에서 보고 있는 달). 연 보기는 null */
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
};

const CHART_HEIGHT = 160;

function monthLabel(month: string): { label: string; year: string | null } {
  const [year, value] = month.split('-').map(Number);
  // 1월에는 해가 바뀐 것을 알 수 있도록 연도를 함께 적는다.
  return { label: `${value}월`, year: value === 1 ? `${year}` : null };
}

function formatMonthLong(month: string): string {
  const [year, value] = month.split('-').map(Number);
  return `${year}년 ${value}월`;
}

/** 축 눈금용 짧은 금액: 1,200,000 → 120만 */
function formatShortWon(amount: number): string {
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만`;
  }

  return amount.toLocaleString('ko-KR');
}

// 12개 달 매출 막대그래프. 한 가지 값이라 범례 없이 제목이 무엇을 그렸는지 말한다.
// 막대를 누르면 그 달 매출로 이동하고, 마우스를 올리거나 포커스하면 금액·건수를 보여 준다.
export function SalesTrendChart({ trend, selectedMonth, onSelectMonth }: SalesTrendChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...trend.map((point) => point.totalAmount), 0);

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">월별 매출</span>
        <span className="text-xs text-[var(--muted)]">막대를 누르면 그 달로 이동합니다</span>
      </figcaption>

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start text-[11px] text-[var(--muted)]">
          {max > 0 ? <span className="tabular-nums">{formatShortWon(max)}</span> : null}
        </div>
        <div
          className="flex items-end gap-0.5 border-b border-[var(--line)] pt-5"
          style={{ height: CHART_HEIGHT + 20 }}
        >
          {trend.map((point) => {
            const height =
              max > 0
                ? Math.max((point.totalAmount / max) * CHART_HEIGHT, point.totalAmount > 0 ? 2 : 0)
                : 0;
            const isSelected = point.month === selectedMonth;
            const isHovered = point.month === hovered;

            return (
              <button
                aria-label={`${formatMonthLong(point.month)} 매출 ${formatWon(point.totalAmount)}, ${point.count}건`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
                key={point.month}
                onBlur={() => setHovered(null)}
                onClick={() => onSelectMonth(point.month)}
                onFocus={() => setHovered(point.month)}
                onMouseEnter={() => setHovered(point.month)}
                onMouseLeave={() => setHovered(null)}
                type="button"
              >
                <span
                  className={`w-full max-w-6 rounded-t-[4px] ${
                    isSelected || selectedMonth === null
                      ? 'bg-[var(--brand)]'
                      : 'bg-[var(--brand)]/35'
                  } ${isHovered ? 'opacity-80' : ''} group-focus-visible:ring-2 group-focus-visible:ring-[var(--brand)] group-focus-visible:ring-offset-2`}
                  style={{ height }}
                />
                {isHovered ? (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-left text-xs whitespace-nowrap shadow-md">
                    <span className="block text-[var(--muted)]">
                      {formatMonthLong(point.month)}
                    </span>
                    <span className="block font-semibold tabular-nums">
                      {formatWon(point.totalAmount)}
                    </span>
                    <span className="block text-[var(--muted)] tabular-nums">{point.count}건</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="flex gap-0.5 pt-1.5">
          {trend.map((point) => {
            const { label, year } = monthLabel(point.month);

            return (
              <span
                className={`flex-1 text-center text-[11px] leading-4 ${
                  point.month === selectedMonth ? 'font-semibold' : 'text-[var(--muted)]'
                }`}
                key={point.month}
              >
                {label}
                {year ? <span className="block text-[10px]">{year}</span> : null}
              </span>
            );
          })}
        </div>
      </div>

      {/* 그래프를 볼 수 없을 때를 위한 표 */}
      <table className="sr-only">
        <caption>월별 매출</caption>
        <thead>
          <tr>
            <th scope="col">달</th>
            <th scope="col">매출</th>
            <th scope="col">건수</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((point) => (
            <tr key={point.month}>
              <td>{formatMonthLong(point.month)}</td>
              <td>{formatWon(point.totalAmount)}</td>
              <td>{point.count}건</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
