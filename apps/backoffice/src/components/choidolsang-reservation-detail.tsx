'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ReservationStatusBadge } from '@/components/reservation-status-badge';
import { AdminApiError } from '@/lib/admin-auth-api';
import { formatInquiryDate, formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  BABY_GENDER_LABELS,
  cancelReservation,
  completeReservation,
  getReservation,
  type Reservation,
} from '@/lib/choidolsang-reservations-api';
import { formatWon } from '@/lib/money';

const EMPTY_VALUE = <span className="text-[var(--muted)]">-</span>;

const SECONDARY_BUTTON_CLASS_NAME =
  'flex h-10 items-center border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]';

function getStatusErrorMessage(error: unknown, action: string): string {
  return error instanceof AdminApiError && error.status === 409
    ? '이미 처리된 예약입니다. 화면을 새로고침해 주세요.'
    : `${action}하지 못했습니다. 잠시 후 다시 시도해 주세요.`;
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function AmountRow({
  label,
  amount,
  strong = false,
}: {
  label: string;
  amount: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-base font-semibold' : 'text-sm'}`}>
        {formatWon(amount)}
      </dd>
    </div>
  );
}

function ReservationBody({ reservation }: { reservation: Reservation }) {
  const { concept } = reservation;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-2 text-sm">
          <span className="text-[var(--muted)]">예약 번호</span>
          <span className="font-mono tracking-wide">{reservation.code}</span>
        </p>
        <ReservationStatusBadge status={reservation.status} />
      </header>

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <InfoItem label="예약자 성함">{reservation.customerName}</InfoItem>
        <InfoItem label="행사 날짜·시간">{formatSeoulDateTime(reservation.eventAt)}</InfoItem>
        <InfoItem label="행사 장소">{reservation.eventLocation}</InfoItem>
        <InfoItem label="참석 인원">
          {reservation.guestCount === null ? EMPTY_VALUE : `${reservation.guestCount}명`}
        </InfoItem>
        <InfoItem label="아기 이름">{reservation.babyName ?? EMPTY_VALUE}</InfoItem>
        <InfoItem label="아기 성별">
          {reservation.babyGender ? BABY_GENDER_LABELS[reservation.babyGender] : EMPTY_VALUE}
        </InfoItem>
        <InfoItem label="돌상 컨셉">
          {concept.isDeleted ? (
            <>
              {concept.name} <span className="text-[var(--muted)]">(삭제됨)</span>
            </>
          ) : (
            <Link
              className="text-[var(--brand)] underline-offset-2 hover:underline"
              href={`/choidolsang/concepts/${concept.id}`}
            >
              {concept.name}
            </Link>
          )}
        </InfoItem>
        <InfoItem label="스냅 촬영">{reservation.hasSnap ? '포함' : '없음'}</InfoItem>
        <InfoItem label="예약 확정 날짜">{formatInquiryDate(reservation.confirmedOn)}</InfoItem>
      </dl>

      <section
        aria-label="추가 요청"
        className="flex flex-col gap-4 bg-[var(--background)] px-5 py-4"
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs text-[var(--muted)]">추가 요청 구성품</h3>
          {reservation.extraComponents.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {reservation.extraComponents.map((component, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 읽기 전용 목록이라 순서가 바뀌지 않고, 같은 이름이 있을 수 있다.
                <li className="flex gap-2 break-words" key={`${index}-${component}`}>
                  <span aria-hidden="true" className="text-[var(--muted)]">
                    ·
                  </span>
                  {component}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">없음</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs text-[var(--muted)]">추가 요청 사항</h3>
          <p className="text-sm leading-6 break-words whitespace-pre-wrap">
            {reservation.requests ?? <span className="text-[var(--muted)]">없음</span>}
          </p>
        </div>
      </section>

      <dl aria-label="금액" className="flex flex-col gap-2 border-t border-[var(--line)] pt-5">
        <AmountRow amount={reservation.totalAmount} label="최종 결제 금액" />
        <AmountRow amount={reservation.depositAmount} label="예약금" />
        <AmountRow amount={reservation.balanceAmount} label="잔금" strong />
      </dl>
    </div>
  );
}

type ReservationActionsProps = {
  reservation: Reservation;
  onChange: (reservation: Reservation) => void;
};

// 왼쪽: [문의 기록] / 오른쪽(예약중일 때만): [예약 취소] [업무 완료]
function ReservationActions({ reservation, onChange }: ReservationActionsProps) {
  const [dialog, setDialog] = useState<'cancel' | 'complete' | null>(null);
  const isReserved = reservation.status === 'reserved';

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
      <Link
        className={SECONDARY_BUTTON_CLASS_NAME}
        href={`/choidolsang/inquiries/${reservation.inquiryCode}`}
      >
        문의 기록
      </Link>

      {isReserved ? (
        <div className="flex gap-2">
          <button
            className={`${SECONDARY_BUTTON_CLASS_NAME} text-[var(--error)]`}
            onClick={() => setDialog('cancel')}
            type="button"
          >
            예약 취소
          </button>
          <button
            className="h-10 bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
            onClick={() => setDialog('complete')}
            type="button"
          >
            업무 완료
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="예약 취소"
        getErrorMessage={(error) => getStatusErrorMessage(error, '예약을 취소')}
        isOpen={dialog === 'cancel'}
        message={
          <>
            예약을 취소하면 상태가 <strong>취소환불</strong>로 바뀌고, 이어진 문의도{' '}
            <strong>취소</strong>로 바뀝니다. 되돌릴 수 없습니다.
          </>
        }
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          onChange(await cancelReservation(reservation.code));
          setDialog(null);
        }}
        pendingLabel="취소 중..."
        title="예약 취소"
        tone="danger"
      />
      <ConfirmDialog
        confirmLabel="업무 완료"
        getErrorMessage={(error) => getStatusErrorMessage(error, '업무 완료 처리')}
        isOpen={dialog === 'complete'}
        message={
          <>
            예약을 <strong>완료</strong>로 바꿉니다. 완료한 예약은 나중에 매출에 반영됩니다. 되돌릴
            수 없습니다.
          </>
        }
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          onChange(await completeReservation(reservation.code));
          setDialog(null);
        }}
        pendingLabel="처리 중..."
        title="업무 완료"
      />
    </footer>
  );
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; reservation: Reservation };

export function ChoidolsangReservationDetail({ code }: { code: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    getReservation(code)
      .then((reservation) => {
        if (isActive) {
          setState({ kind: 'loaded', reservation });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState(
            error instanceof AdminApiError && error.status === 404
              ? { kind: 'not-found' }
              : { kind: 'error' },
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [code]);

  if (state.kind === 'loading') {
    return <p className="py-10 text-sm text-[var(--muted)]">예약을 불러오고 있습니다.</p>;
  }

  if (state.kind === 'not-found') {
    return <p className="py-10 text-sm text-[var(--muted)]">해당 예약을 찾을 수 없습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="py-10 text-sm text-[var(--error)]" role="alert">
        예약을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <ReservationBody reservation={state.reservation} />
      <ReservationActions
        onChange={(reservation) => setState({ kind: 'loaded', reservation })}
        reservation={state.reservation}
      />
    </article>
  );
}
