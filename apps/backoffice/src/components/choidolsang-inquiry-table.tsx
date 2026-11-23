'use client';

import { useEffect, useState } from 'react';
import {
  formatInquiryDate,
  formatReservationDateTime,
  INQUIRY_STATUS_LABELS,
  type InquiryListResponse,
  type InquiryStatus,
  listInquiries,
} from '@/lib/choidolsang-inquiries-api';

const STATUS_BADGE_CLASS_NAMES: Record<InquiryStatus, string> = {
  confirmed: 'bg-[var(--success-soft)] text-[var(--success)]',
  pending: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  rejected: 'bg-[var(--error-soft)] text-[var(--error)]',
};

const EMPTY_VALUE = <span className="text-[var(--muted)]">-</span>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: InquiryListResponse };

export function ChoidolsangInquiryTable() {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 페이지를 다시 불러오기 위한 값이다.
    void reloadKey;
    listInquiries(page)
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
  }, [page, reloadKey]);

  const pagination = state.kind === 'loaded' ? state.data.pagination : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">문의 목록</h2>
        {pagination ? (
          <p className="text-sm text-[var(--muted)]">전체 {pagination.total.toLocaleString()}건</p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium whitespace-nowrap" scope="col">
                문의 날짜
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                문의 내용
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap" scope="col">
                희망 예약일시
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap" scope="col">
                장소
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap" scope="col">
                희망 돌상 컨셉
              </th>
              <th className="px-4 py-3 font-medium whitespace-nowrap" scope="col">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded' && state.data.items.length > 0
              ? state.data.items.map((inquiry) => (
                  <tr className="border-b border-[var(--line)] last:border-b-0" key={inquiry.id}>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatInquiryDate(inquiry.inquiredOn)}
                    </td>
                    <td className="max-w-[24rem] px-4 py-3">
                      <p className="truncate" title={inquiry.content}>
                        {inquiry.content}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {inquiry.desiredReservationAt
                        ? formatReservationDateTime(inquiry.desiredReservationAt)
                        : EMPTY_VALUE}
                    </td>
                    <td className="max-w-[12rem] px-4 py-3">
                      {inquiry.location ? (
                        <p className="truncate" title={inquiry.location}>
                          {inquiry.location}
                        </p>
                      ) : (
                        EMPTY_VALUE
                      )}
                    </td>
                    <td className="max-w-[12rem] px-4 py-3">
                      {inquiry.desiredConcept ? (
                        <p className="truncate" title={inquiry.desiredConcept}>
                          {inquiry.desiredConcept}
                        </p>
                      ) : (
                        EMPTY_VALUE
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS_NAMES[inquiry.status]}`}
                      >
                        {INQUIRY_STATUS_LABELS[inquiry.status]}
                      </span>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        {state.kind === 'loading' ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            문의를 불러오고 있습니다.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10" role="alert">
            <p className="text-sm text-[var(--error)]">문의를 불러오지 못했습니다.</p>
            <button
              className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--background)]"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : null}
        {state.kind === 'loaded' && state.data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            아직 등록된 문의가 없습니다.
          </p>
        ) : null}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <nav aria-label="문의 목록 페이지" className="flex items-center justify-center gap-3">
          <button
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pagination.page <= 1}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            이전
          </button>
          <span className="text-sm tabular-nums text-[var(--muted)]">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            다음
          </button>
        </nav>
      ) : null}
    </section>
  );
}
