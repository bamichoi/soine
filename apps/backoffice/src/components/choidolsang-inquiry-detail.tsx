'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { InquiryContentLog } from '@/components/inquiry-content-log';
import { InquiryDeleteDialog } from '@/components/inquiry-delete-dialog';
import { InquiryRejectDialog } from '@/components/inquiry-reject-dialog';
import { InquiryStatusBadge } from '@/components/inquiry-status-badge';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  formatInquiryDate,
  formatSeoulDateTime,
  getInquiry,
  type InquiryDetail,
  reopenInquiry,
} from '@/lib/choidolsang-inquiries-api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; inquiry: InquiryDetail };

const EMPTY_VALUE = <span className="text-[var(--muted)]">-</span>;

const SECONDARY_BUTTON_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50';

const LIST_PATH = '/choidolsang/inquiries';

const STALE_STATUS_MESSAGE = '이미 처리된 문의입니다. 화면을 새로고침해 주세요.';

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

// 삭제되지 않은 컨셉은 돌상 컨셉 상세로 이동할 수 있다.
function DesiredConcept({ concept }: { concept: InquiryDetail['desiredConcept'] }) {
  if (!concept) {
    return EMPTY_VALUE;
  }

  if (concept.isDeleted) {
    return (
      <>
        {concept.name} <span className="text-[var(--muted)]">(삭제됨)</span>
      </>
    );
  }

  return (
    <Link
      className="text-[var(--brand)] underline-offset-2 hover:underline"
      href={`/choidolsang/concepts/${concept.id}`}
    >
      {concept.name}
    </Link>
  );
}

function InquiryBody({ inquiry, onChange }: InquiryActionsProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-2 text-sm">
          <span className="text-[var(--muted)]">문의 번호</span>
          <span className="font-mono tracking-wide">{inquiry.code}</span>
        </p>
        <InquiryStatusBadge status={inquiry.status} />
      </header>

      <InquiryContentLog inquiry={inquiry} onChange={onChange} />

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <InfoItem label="문의 날짜">{formatInquiryDate(inquiry.inquiredOn)}</InfoItem>
        <InfoItem label="희망 예약일시">
          {inquiry.desiredReservationAt
            ? formatSeoulDateTime(inquiry.desiredReservationAt)
            : EMPTY_VALUE}
        </InfoItem>
        <InfoItem label="장소">{inquiry.location ?? EMPTY_VALUE}</InfoItem>
        <InfoItem label="희망 돌상 컨셉">
          <DesiredConcept concept={inquiry.desiredConcept} />
        </InfoItem>
      </dl>

      {inquiry.status === 'rejected' && inquiry.rejectionReason ? (
        <section
          aria-label="거절 사유"
          className="flex flex-col gap-1 bg-[var(--error-soft)] px-5 py-4"
        >
          <h3 className="text-xs font-medium text-[var(--error)]">거절 사유</h3>
          <p className="text-sm leading-6 break-words whitespace-pre-wrap">
            {inquiry.rejectionReason}
          </p>
        </section>
      ) : null}
    </div>
  );
}

type InquiryActionsProps = {
  inquiry: InquiryDetail;
  onChange: (inquiry: InquiryDetail) => void;
};

const PRIMARY_BUTTON_CLASS_NAME =
  'h-10 bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50';

// 예약확정·취소 문의는 이어진 예약으로 간다.
function ReservationLink({ reservationCode }: { reservationCode: string | null }) {
  if (!reservationCode) {
    return (
      <button
        className={PRIMARY_BUTTON_CLASS_NAME}
        disabled
        title="이어진 예약이 없습니다."
        type="button"
      >
        예약 정보
      </button>
    );
  }

  return (
    <Link
      className={`${PRIMARY_BUTTON_CLASS_NAME} flex items-center`}
      href={`/choidolsang/reservations/${reservationCode}`}
    >
      예약 정보
    </Link>
  );
}

// 상태별 버튼 — 대기: [거절] [예약 진행] / 거절: [대기] [예약 진행] / 예약확정·취소: [예약 정보]
function StatusActions({ inquiry, onChange }: InquiryActionsProps) {
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (inquiry.status === 'confirmed' || inquiry.status === 'cancelled') {
    return <ReservationLink reservationCode={inquiry.reservationCode} />;
  }

  async function handleReopen() {
    setErrorMessage('');
    setIsReopening(true);

    try {
      onChange(await reopenInquiry(inquiry.code));
    } catch (error) {
      setErrorMessage(
        error instanceof AdminApiError && error.status === 409
          ? STALE_STATUS_MESSAGE
          : '대기로 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsReopening(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      {errorMessage ? (
        <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex gap-2">
        {inquiry.status === 'pending' ? (
          <button
            className={`${SECONDARY_BUTTON_CLASS_NAME} text-[var(--error)]`}
            onClick={() => setIsRejectOpen(true)}
            type="button"
          >
            거절
          </button>
        ) : (
          <button
            className={SECONDARY_BUTTON_CLASS_NAME}
            disabled={isReopening}
            onClick={handleReopen}
            type="button"
          >
            {isReopening ? '변경 중...' : '대기'}
          </button>
        )}
        <Link
          className={`${PRIMARY_BUTTON_CLASS_NAME} flex items-center`}
          href={`/choidolsang/reservations/new?inquiry=${inquiry.code}`}
        >
          예약 진행
        </Link>
      </div>

      <InquiryRejectDialog
        code={inquiry.code}
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onRejected={(rejected) => {
          setIsRejectOpen(false);
          onChange(rejected);
        }}
      />
    </div>
  );
}

// 왼쪽: [수정] [삭제] / 오른쪽: 상태별 버튼
function InquiryActions({ inquiry, onChange }: InquiryActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const querySuffix = listQuery ? `?${listQuery}` : '';
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <footer className="flex flex-wrap items-start justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
      <div className="flex gap-2">
        <Link
          className={`${SECONDARY_BUTTON_CLASS_NAME} flex items-center`}
          href={`${LIST_PATH}/${inquiry.code}/edit${querySuffix}`}
        >
          수정
        </Link>
        {/* 예약으로 이어진 문의는 예약이 가리키고 있어 지울 수 없다. */}
        <button
          className={SECONDARY_BUTTON_CLASS_NAME}
          disabled={inquiry.reservationCode !== null}
          onClick={() => setIsDeleteOpen(true)}
          title={inquiry.reservationCode ? '예약으로 이어진 문의는 삭제할 수 없습니다.' : undefined}
          type="button"
        >
          삭제
        </button>
      </div>

      <StatusActions inquiry={inquiry} onChange={onChange} />

      <InquiryDeleteDialog
        code={inquiry.code}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => router.push(`${LIST_PATH}${querySuffix}`)}
      />
    </footer>
  );
}

export function ChoidolsangInquiryDetail({ code }: { code: string }) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    getInquiry(code)
      .then((inquiry) => {
        if (isActive) {
          setState({ inquiry, kind: 'loaded' });
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
    return <p className="py-10 text-sm text-[var(--muted)]">문의를 불러오고 있습니다.</p>;
  }

  if (state.kind === 'not-found') {
    return <p className="py-10 text-sm text-[var(--muted)]">해당 문의를 찾을 수 없습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="py-10 text-sm text-[var(--error)]" role="alert">
        문의를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  const handleChange = (inquiry: InquiryDetail) => setState({ inquiry, kind: 'loaded' });

  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <InquiryBody inquiry={state.inquiry} onChange={handleChange} />
      <InquiryActions inquiry={state.inquiry} onChange={handleChange} />
    </article>
  );
}
