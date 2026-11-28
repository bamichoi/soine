'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  DANGER_PRIMARY_BUTTON_CLASS_NAME,
  ERROR_BOX_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

type ConfirmDialogProps = {
  title: string;
  message: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  /** 확인을 누르면 실행한다. 실패하면 오류를 던진다. */
  onConfirm: () => Promise<void>;
  confirmLabel: string;
  pendingLabel: string;
  /** danger면 확인 버튼을 빨간색으로 */
  tone?: 'primary' | 'danger';
  /** 실패했을 때 보여 줄 문구 */
  getErrorMessage: (error: unknown) => string;
};

const DIALOG_CLASS_NAME =
  'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-[20px] border-0 bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-(--shadow-pop) backdrop:bg-[var(--backdrop)]';

// 확인 버튼 (docs/design/goodplace-style-guide.md '버튼')
const CONFIRM_TONE_CLASS_NAMES = {
  danger: DANGER_PRIMARY_BUTTON_CLASS_NAME,
  primary: PRIMARY_BUTTON_CLASS_NAME,
};

// 되돌리기 어려운 동작을 한 번 더 확인하는 공통 모달.
// 네이티브 <dialog>라 Esc 닫기와 포커스 가두기가 기본으로 된다.
export function ConfirmDialog({
  title,
  message,
  isOpen,
  onClose,
  onConfirm,
  confirmLabel,
  pendingLabel,
  tone = 'primary',
  getErrorMessage,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [errorMessage, setErrorMessage] = useState('');
  const [isPending, setIsPending] = useState(false);

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

  async function handleConfirm() {
    setErrorMessage('');
    setIsPending(true);

    try {
      await onConfirm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className={DIALOG_CLASS_NAME}
      onCancel={(event) => {
        if (isPending) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-extrabold" id={titleId}>
          {title}
        </h2>
        <div className="text-sm leading-6">{message}</div>
        {errorMessage ? (
          <p className={ERROR_BOX_CLASS_NAME} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            className={SECONDARY_BUTTON_CLASS_NAME}
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            취소
          </button>
          <button
            className={CONFIRM_TONE_CLASS_NAMES[tone]}
            disabled={isPending}
            onClick={handleConfirm}
            type="button"
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
