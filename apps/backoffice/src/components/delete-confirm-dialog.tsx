'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { AdminApiError } from '@/lib/admin-auth-api';

type DeleteConfirmDialogProps = {
  title: string;
  message: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  /** 삭제를 실행한다. 실패하면 오류를 던진다. */
  onConfirm: () => Promise<void>;
  /** 이미 지워졌을 때(404) 보여 줄 문구 */
  notFoundMessage: string;
};

// 삭제를 한 번 더 확인하는 공통 모달. 네이티브 <dialog>라 Esc 닫기와 포커스 가두기가 기본으로 된다.
export function DeleteConfirmDialog({
  title,
  message,
  isOpen,
  onClose,
  onConfirm,
  notFoundMessage,
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      setErrorMessage('');
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  async function handleDelete() {
    setErrorMessage('');
    setIsDeleting(true);

    try {
      await onConfirm();
    } catch (error) {
      setErrorMessage(
        error instanceof AdminApiError && error.status === 404
          ? notFoundMessage
          : '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
      setIsDeleting(false);
    }
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/40"
      onCancel={(event) => {
        if (isDeleting) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold" id={titleId}>
          {title}
        </h2>
        <p className="text-sm leading-6">{message}</p>
        {errorMessage ? (
          <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            className="h-10 border border-[var(--line)] px-4 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-60"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            취소
          </button>
          <button
            className="h-10 bg-[var(--error)] px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={handleDelete}
            type="button"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
