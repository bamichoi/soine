'use client';

import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { deleteInquiry } from '@/lib/choidolsang-inquiries-api';

type InquiryDeleteDialogProps = {
  code: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

// 문의 삭제를 한 번 더 확인한다. 삭제는 숨김 처리라 DB 기록은 남는다.
export function InquiryDeleteDialog({
  code,
  isOpen,
  onClose,
  onDeleted,
}: InquiryDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      message={
        <>
          문의 <span className="font-mono">{code}</span>를 삭제할까요? 삭제한 문의는 목록에서 보이지
          않습니다.
        </>
      }
      conflictMessage="예약으로 이어진 문의는 삭제할 수 없습니다."
      notFoundMessage="이미 삭제된 문의입니다. 목록으로 돌아가 주세요."
      onClose={onClose}
      onConfirm={async () => {
        await deleteInquiry(code);
        onDeleted();
      }}
      title="문의 삭제"
    />
  );
}
