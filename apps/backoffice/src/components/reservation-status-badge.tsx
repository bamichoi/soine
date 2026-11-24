import {
  RESERVATION_STATUS_LABELS,
  type ReservationStatus,
} from '@/lib/choidolsang-reservations-api';

const STATUS_CLASS_NAMES: Record<ReservationStatus, string> = {
  cancelled: 'bg-[var(--background)] text-[var(--muted)]',
  completed: 'bg-[var(--success-soft)] text-[var(--success)]',
  reserved: 'bg-[var(--brand-soft)] text-[var(--brand)]',
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs ${STATUS_CLASS_NAMES[status]}`}>
      {RESERVATION_STATUS_LABELS[status]}
    </span>
  );
}
