'use client';

import { LogPanel } from '@/components/log-panel';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  addInquiryRecord,
  type InquiryDetail,
  updateInquiryRecord,
} from '@/lib/choidolsang-inquiries-api';

function getErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError && error.status === 404) {
    return '없는 기록입니다. 화면을 새로고침해 주세요.';
  }

  return '기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

type InquiryContentLogProps = {
  inquiry: InquiryDetail;
  onChange: (inquiry: InquiryDetail) => void;
};

// 문의 내용을 기록 날짜와 함께 로그처럼 쌓아 보여 준다. 첫 기록이 첫 문의다.
// 기록은 고칠 수만 있고 지우지 않는다. 모양은 공통 기록 카드(LogPanel)를 쓴다.
export function InquiryContentLog({ inquiry, onChange }: InquiryContentLogProps) {
  return (
    <LogPanel
      entries={inquiry.records}
      getErrorMessage={getErrorMessage}
      onAdd={async ({ content, recordedOn }) => {
        onChange(await addInquiryRecord(inquiry.code, { content, recordedOn }));
      }}
      onUpdate={async (id, { content, recordedOn }) => {
        onChange(await updateInquiryRecord(inquiry.code, id, { content, recordedOn }));
      }}
      placeholder="고객이 남긴 문의 내용을 입력해 주세요."
      title="문의 내용"
    />
  );
}
