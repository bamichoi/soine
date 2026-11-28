'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataLoader } from '@/components/data-loader';
import {
  DetailHead,
  InfoGroup,
  InfoItem,
  InfoLink,
  InfoSheet,
  InfoTextGroup,
} from '@/components/detail-parts';
import { PhoneNumber } from '@/components/phone-number';
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
import {
  DANGER_BUTTON_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

function getStatusErrorMessage(error: unknown, action: string): string {
  return error instanceof AdminApiError && error.status === 409
    ? '이미 처리된 예약입니다. 화면을 새로고침해 주세요.'
    : `${action}하지 못했습니다. 잠시 후 다시 시도해 주세요.`;
}

type ReservationActionsProps = {
  reservation: Reservation;
  onChange: (reservation: Reservation) => void;
};

// 제목 줄 오른쪽 버튼. 예약중일 때만: [수정] [예약 취소] [업무 완료]
// 완료·취소환불된 예약은 기록으로 남기므로 버튼이 없다.
function ReservationActions({ reservation, onChange }: ReservationActionsProps) {
  const [dialog, setDialog] = useState<'cancel' | 'complete' | null>(null);

  if (reservation.status !== 'reserved') {
    return null;
  }

  return (
    <>
      <Link
        className={SECONDARY_BUTTON_CLASS_NAME}
        href={`/choidolsang/reservations/${reservation.code}/edit`}
      >
        수정
      </Link>
      <button
        className={DANGER_BUTTON_CLASS_NAME}
        onClick={() => setDialog('cancel')}
        type="button"
      >
        예약 취소
      </button>
      <button
        className={PRIMARY_BUTTON_CLASS_NAME}
        onClick={() => setDialog('complete')}
        type="button"
      >
        업무 완료
      </button>

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
    </>
  );
}

/** 추가 요청 구성품은 한 줄에 하나씩 */
function toComponentLines(components: string[]): string | null {
  return components.length > 0 ? components.map((component) => `· ${component}`).join('\n') : null;
}

function ReservationBody({ reservation, onChange }: ReservationActionsProps) {
  const { concept } = reservation;

  return (
    <article>
      <DetailHead
        actions={<ReservationActions onChange={onChange} reservation={reservation} />}
        badge={<ReservationStatusBadge status={reservation.status} />}
        code={reservation.code}
        codeLabel="예약"
        copyLabel="예약 번호"
        title={reservation.customerName}
      />

      {/* 예약자 이름은 제목에만 둔다. 묶음 순서(사람 → 행사 → 상품 → 금액)로만 중요도를 준다. */}
      <InfoSheet label="예약 정보">
        <InfoGroup title="예약자">
          <InfoItem label="연락처">
            <PhoneNumber phone={reservation.customerPhone} />
          </InfoItem>
          <InfoItem label="아기 이름">{reservation.babyName}</InfoItem>
          <InfoItem label="아기 성별">{BABY_GENDER_LABELS[reservation.babyGender]}</InfoItem>
          <InfoItem label="문의">
            <InfoLink href={`/choidolsang/inquiries/${reservation.inquiryCode}`}>
              <span className="font-mono text-[13px]" translate="no">
                {reservation.inquiryCode}
              </span>
            </InfoLink>
          </InfoItem>
        </InfoGroup>
        <InfoGroup title="행사">
          <InfoItem label="행사 날짜·시간">
            <span className="tabular-nums">{formatSeoulDateTime(reservation.eventAt)}</span>
          </InfoItem>
          <InfoItem label="행사 장소">{reservation.eventLocation}</InfoItem>
          <InfoItem label="참석 인원">
            <span className="tabular-nums">{reservation.guestCount}명</span>
          </InfoItem>
          <InfoItem label="예약 확정 날짜">
            <span className="tabular-nums">{formatInquiryDate(reservation.confirmedOn)}</span>
          </InfoItem>
        </InfoGroup>
        <InfoGroup title="상품">
          <InfoItem className="col-span-2 md:col-span-3" label="돌상 컨셉">
            {concept.isDeleted ? (
              <>
                {concept.name} <span className="text-[var(--muted)]">(삭제됨)</span>
              </>
            ) : (
              <InfoLink href={`/choidolsang/concepts/${concept.id}`}>{concept.name}</InfoLink>
            )}
          </InfoItem>
          <InfoItem label="스냅 촬영">{reservation.hasSnap ? '포함' : '미포함'}</InfoItem>
        </InfoGroup>
        <InfoTextGroup
          text={toComponentLines(reservation.extraComponents)}
          title="추가 요청 구성품"
        />
        <InfoTextGroup text={reservation.requests} title="추가 요청 사항" />
        <InfoGroup title="금액">
          <InfoItem isMoney label="최종 결제 금액">
            {formatWon(reservation.totalAmount)}
          </InfoItem>
          <InfoItem isMoney label="예약금">
            {formatWon(reservation.depositAmount)}
          </InfoItem>
          <InfoItem isMoney label="잔금">
            {formatWon(reservation.balanceAmount)}
          </InfoItem>
        </InfoGroup>
      </InfoSheet>
    </article>
  );
}

export function ChoidolsangReservationDetail({ code }: { code: string }) {
  return (
    <DataLoader load={getReservation} loadKey={code} noun="예약">
      {(reservation, replace) => <ReservationBody onChange={replace} reservation={reservation} />}
    </DataLoader>
  );
}
