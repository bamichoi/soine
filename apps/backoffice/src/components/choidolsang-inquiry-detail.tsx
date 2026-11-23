'use client';

import { type ReactNode, useEffect, useState } from 'react';
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

const STALE_STATUS_MESSAGE = '이미 처리된 문의입니다. 화면을 새로고침해 주세요.';

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function InquiryBody({ inquiry }: { inquiry: InquiryDetail }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-2 text-sm">
          <span className="text-[var(--muted)]">문의 번호</span>
          <span className="font-mono tracking-wide">{inquiry.code}</span>
        </p>
        <InquiryStatusBadge status={inquiry.status} />
      </header>

      <section aria-label="문의 내용" className="bg-[var(--background)] px-5 py-4">
        <p className="text-[15px] leading-7 break-words whitespace-pre-wrap">{inquiry.content}</p>
      </section>

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <InfoItem label="문의 날짜">{formatInquiryDate(inquiry.inquiredOn)}</InfoItem>
        <InfoItem label="희망 예약일시">
          {inquiry.desiredReservationAt
            ? formatSeoulDateTime(inquiry.desiredReservationAt)
            : EMPTY_VALUE}
        </InfoItem>
        <InfoItem label="장소">{inquiry.location ?? EMPTY_VALUE}</InfoItem>
        <InfoItem label="희망 돌상 컨셉">{inquiry.desiredConcept ?? EMPTY_VALUE}</InfoItem>
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

// 대기: [거절] [예약 진행] / 거절: [대기] [예약 진행] / 예약확정·취소: 버튼 없음
function InquiryActions({ inquiry, onChange }: InquiryActionsProps) {
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (inquiry.status === 'confirmed' || inquiry.status === 'cancelled') {
    return null;
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
    <footer className="flex flex-col gap-3 border-t border-[var(--line)] px-6 py-4">
      {errorMessage ? (
        <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
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
        <button
          className="h-10 bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled
          title="예약 폼은 준비 중입니다."
          type="button"
        >
          예약 진행
        </button>
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

  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <InquiryBody inquiry={state.inquiry} />
      <InquiryActions
        inquiry={state.inquiry}
        onChange={(inquiry) => setState({ inquiry, kind: 'loaded' })}
      />
    </article>
  );
}
