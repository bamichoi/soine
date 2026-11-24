'use client';

import type { ReactNode } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
  /** 지울 수 없을 때(409) 보여 줄 문구 */
  conflictMessage?: string;
};

// 삭제를 한 번 더 확인한다.
export function DeleteConfirmDialog({
  notFoundMessage,
  conflictMessage,
  ...props
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      {...props}
      confirmLabel="삭제"
      getErrorMessage={(error) => {
        if (error instanceof AdminApiError && error.status === 404) {
          return notFoundMessage;
        }

        if (error instanceof AdminApiError && error.status === 409 && conflictMessage) {
          return conflictMessage;
        }

        return '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
      }}
      pendingLabel="삭제 중..."
      tone="danger"
    />
  );
}
