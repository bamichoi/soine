'use client';

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  type InquiryDetail,
  REJECTION_REASON_MAX_LENGTH,
  rejectInquiry,
} from '@/lib/choidolsang-inquiries-api';

type InquiryRejectDialogProps = {
  code: string;
  isOpen: boolean;
  onClose: () => void;
  onRejected: (inquiry: InquiryDetail) => void;
};

// 거절 사유를 받아 문의를 거절한다. 네이티브 <dialog>라 Esc 닫기와 포커스 가두기가 기본으로 된다.
export function InquiryRejectDialog({
  code,
  isOpen,
  onClose,
  onRejected,
}: InquiryRejectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      setReason('');
      setErrorMessage('');
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason.trim()) {
      setErrorMessage('거절 사유를 입력해 주세요.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      onRejected(await rejectInquiry(code, reason.trim()));
    } catch (error) {
      setErrorMessage(
        error instanceof AdminApiError && error.status === 409
          ? '이미 처리된 문의입니다. 화면을 새로고침해 주세요.'
          : '거절하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/40"
      onCancel={(event) => {
        // Esc: 저장 중에는 닫지 않는다.
        if (isSubmitting) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <form className="flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold" id={titleId}>
          문의 거절
        </h2>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor={reasonId}>
            거절 사유
            <span aria-hidden="true" className="ml-0.5 text-[var(--error)]">
              *
            </span>
          </label>
          <textarea
            className="min-h-32 w-full resize-y border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-[var(--brand)] disabled:opacity-60"
            disabled={isSubmitting}
            id={reasonId}
            maxLength={REJECTION_REASON_MAX_LENGTH}
            onChange={(event) => setReason(event.target.value)}
            placeholder="고객에게 안내할 거절 사유를 입력해 주세요."
            required
            value={reason}
          />
          <p className="text-xs text-[var(--muted)]">
            {reason.length.toLocaleString()} / {REJECTION_REASON_MAX_LENGTH.toLocaleString()}자
          </p>
        </div>
        {errorMessage ? (
          <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            className="h-10 border border-[var(--line)] px-4 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            취소
          </button>
          <button
            className="h-10 bg-[var(--error)] px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '거절 중...' : '거절 확정'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
