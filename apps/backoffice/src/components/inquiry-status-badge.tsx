import { StatusBadge } from '@/components/status-badge';
import { INQUIRY_STATUS_LABELS, type InquiryStatus } from '@/lib/choidolsang-inquiries-api';
import type { StatusTone } from '@/lib/ui';

// 색은 그대로: 대기 노랑, 예약확정 초록, 거절 빨강, 취소 회색.
const STATUS_TONES: Record<InquiryStatus, StatusTone> = {
  cancelled: 'muted',
  confirmed: 'done',
  pending: 'idle',
  rejected: 'negative',
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return <StatusBadge label={INQUIRY_STATUS_LABELS[status]} tone={STATUS_TONES[status]} />;
}
