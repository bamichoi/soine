import { INQUIRY_STATUS_LABELS, type InquiryStatus } from '@/lib/choidolsang-inquiries-api';

const STATUS_CLASS_NAMES: Record<InquiryStatus, string> = {
  cancelled: 'bg-[var(--background)] text-[var(--muted)]',
  confirmed: 'bg-[var(--success-soft)] text-[var(--success)]',
  pending: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  rejected: 'bg-[var(--error-soft)] text-[var(--error)]',
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs ${STATUS_CLASS_NAMES[status]}`}>
      {INQUIRY_STATUS_LABELS[status]}
    </span>
  );
}
