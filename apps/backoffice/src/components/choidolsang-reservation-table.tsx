'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { ReservationStatusBadge } from '@/components/reservation-status-badge';
import { formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import { listReservations, type ReservationListResponse } from '@/lib/choidolsang-reservations-api';
import { formatWon } from '@/lib/money';

const BUTTON_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: ReservationListResponse };

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

// 예약 목록. 예약은 문의에서 만들므로 여기에는 추가 버튼이 없다.
export function ChoidolsangReservationTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 조건을 다시 불러오기 위한 값이다.
    void reloadKey;
    listReservations(page)
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
  const listQuery = page > 1 ? `?page=${page}` : '';

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold">예약</h2>
        {pagination ? (
          <p className="text-sm text-[var(--muted)]">{pagination.total.toLocaleString()}건</p>
        ) : null}
      </div>

      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[52rem] table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="w-28 px-4 py-3 font-medium" scope="col">
                예약 번호
              </th>
              <th className="w-40 px-4 py-3 font-medium" scope="col">
                행사 일시
              </th>
              <th className="w-28 px-4 py-3 font-medium" scope="col">
                예약자
              </th>
              <th className="w-28 px-4 py-3 font-medium" scope="col">
                아기 이름
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                돌상 컨셉
              </th>
              <th className="w-32 px-4 py-3 text-right font-medium" scope="col">
                최종 결제 금액
              </th>
              <th className="w-24 px-4 py-3 font-medium" scope="col">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((reservation) => (
                  // 행 전체를 누르면 상세로 간다. 예약 번호 링크를 행 크기로 늘려 링크 동작을 그대로 쓴다.
                  <tr
                    className="relative cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--background)] has-[a:focus-visible]:bg-[var(--brand-soft)]"
                    key={reservation.id}
                  >
                    <td className="px-4 py-3">
                      <Link
                        aria-label={`예약 ${reservation.code} 상세 보기`}
                        className="font-mono text-[13px] tracking-wide outline-none after:absolute after:inset-0"
                        href={`${pathname}/${reservation.code}${listQuery}`}
                      >
                        {reservation.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatSeoulDateTime(reservation.eventAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{reservation.customerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{reservation.babyName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate" title={reservation.concept.name}>
                        {reservation.concept.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatWon(reservation.totalAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ReservationStatusBadge status={reservation.status} />
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        {state.kind === 'loading' ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            예약을 불러오고 있습니다.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10" role="alert">
            <p className="text-sm text-[var(--error)]">예약을 불러오지 못했습니다.</p>
            <button
              className={BUTTON_CLASS_NAME}
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : null}
        {state.kind === 'loaded' && state.data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            아직 예약이 없습니다. 문의 상세에서 예약 진행을 눌러 예약을 만들어 주세요.
          </p>
        ) : null}
      </div>

      {pagination ? (
        <Pagination
          label="예약 페이지"
          onChange={(nextPage) =>
            router.replace(nextPage > 1 ? `${pathname}?page=${nextPage}` : pathname, {
              scroll: false,
            })
          }
          page={pagination.page}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
