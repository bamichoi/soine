'use client';

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  DANGER_PRIMARY_BUTTON_CLASS_NAME,
  ERROR_BOX_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

type ReasonDialogProps = {
  title: string;
  label: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

// 사유를 꼭 적어야 하는 상태 변경(미팅중단·재개, 계약취소)을 확인하는 모달.
// 공통 모달 모양(docs/design/goodplace-style-guide.md '모달')이다.
export function ReasonDialog({
  title,
  label,
  confirmLabel,
  tone = 'primary',
  isOpen,
  onClose,
  onConfirm,
}: ReasonDialogProps) {
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
      setErrorMessage(`${label}을(를) 입력해 주세요.`);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await onConfirm(reason.trim());
    } catch (error) {
      setErrorMessage(
        error instanceof AdminApiError && error.status === 409
          ? '이미 상태가 바뀌었습니다. 화면을 새로고침해 주세요.'
          : '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[20px] border-0 bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-(--shadow-pop) backdrop:bg-[var(--backdrop)]"
      onCancel={(event) => {
        if (isSubmitting) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <form className="flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
        <h2 className="text-lg font-extrabold" id={titleId}>
          {title}
        </h2>
        <label className="flex flex-col gap-2 text-sm font-semibold" htmlFor={reasonId}>
          <span>
            {label}
            <span aria-hidden="true" className="ml-0.5 text-[var(--error)]">
              *
            </span>
          </span>
          <textarea
            className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-28 font-normal`}
            disabled={isSubmitting}
            id={reasonId}
            maxLength={5000}
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
        </label>
        {errorMessage ? (
          <p className={ERROR_BOX_CLASS_NAME} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            className={SECONDARY_BUTTON_CLASS_NAME}
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            취소
          </button>
          <button
            className={
              tone === 'danger' ? DANGER_PRIMARY_BUTTON_CLASS_NAME : PRIMARY_BUTTON_CLASS_NAME
            }
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
