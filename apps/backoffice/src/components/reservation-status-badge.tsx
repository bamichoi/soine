import { StatusBadge } from '@/components/status-badge';
import {
  RESERVATION_STATUS_LABELS,
  type ReservationStatus,
} from '@/lib/choidolsang-reservations-api';
import type { StatusTone } from '@/lib/ui';

// 색은 그대로: 예약중 파랑, 완료 초록, 취소환불 회색.
const STATUS_TONES: Record<ReservationStatus, StatusTone> = {
  cancelled: 'muted',
  completed: 'done',
  reserved: 'active',
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <StatusBadge label={RESERVATION_STATUS_LABELS[status]} tone={STATUS_TONES[status]} />;
}
