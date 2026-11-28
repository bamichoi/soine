'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';
import { Icon } from '@/components/icon';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** 제목 아래 짧은 안내 */
  description?: string;
  children: ReactNode;
  /** 아래 버튼 줄 */
  footer?: ReactNode;
  /** 모달 너비 (기본 32rem) */
  widthClassName?: string;
};

// 공통 모달 틀. 제목 줄 오른쪽 X로 닫는다. 열면 data-autofocus를 단 요소에 포커스를 준다. 네이티브 <dialog>라 Esc 닫기와 포커스 가두기가 기본으로 된다.
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = 'w-[min(32rem,calc(100vw-2rem))]',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
      // 기본으로는 첫 버튼(X)에 포커스가 가므로, data-autofocus를 단 입력칸으로 옮긴다.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      aria-labelledby={titleId}
      className={`m-auto max-h-[calc(100dvh-2rem)] ${widthClassName} border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl outline-none backdrop:bg-black/40`}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold" id={titleId}>
              {title}
            </h2>
            {description ? <p className="text-xs text-[var(--muted)]">{description}</p> : null}
          </div>
          <button
            aria-label="닫기"
            className="-mr-2 flex size-8 shrink-0 items-center justify-center text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            onClick={onClose}
            type="button"
          >
            <Icon className="size-4" name="x" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-[var(--line)] bg-[var(--background)] px-6 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
