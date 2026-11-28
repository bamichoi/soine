'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  DANGER_PRIMARY_BUTTON_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/kkiru-ui';

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
  /** 'kkiru'면 끼루 모달 모양(둥근 틀, 끼루 버튼 상수). 기본은 지금 모양 그대로 */
  look?: 'default' | 'kkiru';
};

const CONFIRM_TONE_CLASS_NAMES = {
  danger: 'bg-[var(--error)] hover:opacity-90',
  primary: 'bg-[var(--brand)] hover:bg-[var(--brand-hover)]',
};

// 모양별 클래스. default는 지금 클래스 그대로다.
const LOOKS = {
  default: {
    body: 'flex flex-col gap-4 p-6',
    cancel:
      'h-10 border border-[var(--line)] px-4 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-60',
    confirm:
      'h-10 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60',
    dialog:
      'm-auto w-[min(26rem,calc(100vw-2rem))] border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/40',
    error: 'bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]',
    title: 'text-lg font-semibold',
    tones: CONFIRM_TONE_CLASS_NAMES,
  },
  kkiru: {
    body: 'flex flex-col gap-4 px-6 pt-6 pb-6',
    cancel: SECONDARY_BUTTON_CLASS_NAME,
    // 확인 버튼 모양은 tones에 다 들어 있다 (docs/design/kkiru-style-guide.md '버튼').
    confirm: '',
    dialog:
      'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-[20px] border-0 bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-[0_12px_40px_rgba(16,24,40,0.16)] backdrop:bg-black/40',
    error: 'rounded-xl bg-[var(--error-soft)] px-4 py-3 text-sm text-[var(--error)]',
    title: 'text-lg font-extrabold',
    tones: {
      danger: DANGER_PRIMARY_BUTTON_CLASS_NAME,
      primary: PRIMARY_BUTTON_CLASS_NAME,
    },
  },
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
  look = 'default',
}: ConfirmDialogProps) {
  const classes = LOOKS[look];
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
      className={classes.dialog}
      onCancel={(event) => {
        if (isPending) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className={classes.body}>
        <h2 className={classes.title} id={titleId}>
          {title}
        </h2>
        <div className="text-sm leading-6">{message}</div>
        {errorMessage ? (
          <p className={classes.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button className={classes.cancel} disabled={isPending} onClick={onClose} type="button">
            취소
          </button>
          <button
            className={`${classes.confirm} ${classes.tones[tone]}`}
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
