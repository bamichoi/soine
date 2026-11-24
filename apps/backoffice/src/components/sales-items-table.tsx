'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  listSalesItems,
  type SalesItemsResponse,
  type SalesPeriod,
} from '@/lib/choidolsang-sales-api';
import { formatWon } from '@/lib/money';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: SalesItemsResponse };

type SalesItemsTableProps = {
  period: SalesPeriod;
  page: number;
  onPageChange: (page: number) => void;
};

// 이 기간 매출로 잡힌 예약(업무 완료 시각 최근 순). 행을 누르면 예약 상세로 간다.
export function SalesItemsTable({ period, page, onPageChange }: SalesItemsTableProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const periodKey = `${period.kind}:${period.key}`;

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });
    const [kind, key] = periodKey.split(':') as [SalesPeriod['kind'], string];

    listSalesItems({ key, kind }, page)
      .then((data) => {
        if (isActive) {
          setState({ data, kind: 'loaded' });
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
  }, [periodKey, page]);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        매출 내역
        {state.kind === 'loaded' ? (
          <span className="ml-2 font-normal text-[var(--muted)]">
            {state.data.pagination.total.toLocaleString()}건
          </span>
        ) : null}
      </h3>
      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[44rem] table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="w-40 px-4 py-3 font-medium" scope="col">
                업무 완료
              </th>
              <th className="w-28 px-4 py-3 font-medium" scope="col">
                예약 번호
              </th>
              <th className="w-28 px-4 py-3 font-medium" scope="col">
                예약자
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                돌상 컨셉
              </th>
              <th className="w-32 px-4 py-3 text-right font-medium" scope="col">
                최종 결제 금액
              </th>
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((item) => (
                  <tr
                    className="relative cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--background)] has-[a:focus-visible]:bg-[var(--brand-soft)]"
                    key={item.code}
                  >
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatSeoulDateTime(item.completedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        aria-label={`예약 ${item.code} 상세 보기`}
                        className="font-mono text-[13px] tracking-wide outline-none after:absolute after:inset-0"
                        href={`/choidolsang/reservations/${item.code}`}
                      >
                        {item.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{item.customerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{item.conceptName}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatWon(item.totalAmount)}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
        {state.kind === 'loading' ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">불러오고 있습니다.</p>
        ) : null}
        {state.kind === 'error' ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--error)]" role="alert">
            매출 내역을 불러오지 못했습니다.
          </p>
        ) : null}
        {state.kind === 'loaded' && state.data.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            이 기간 매출이 없습니다.
          </p>
        ) : null}
      </div>
      {state.kind === 'loaded' ? (
        <Pagination
          label="매출 내역 페이지"
          onChange={onPageChange}
          page={state.data.pagination.page}
          totalPages={state.data.pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
