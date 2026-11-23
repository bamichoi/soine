import { requestAdminApi } from '@/lib/admin-auth-api';

export type InquiryStatus = 'pending' | 'confirmed' | 'rejected';

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  confirmed: '예약확정',
  pending: '대기',
  rejected: '거절',
};

export type Inquiry = {
  id: string;
  /** 문의 날짜 (YYYY-MM-DD) */
  inquiredOn: string;
  content: string;
  /** 희망 예약 일시 (ISO 8601) */
  desiredReservationAt: string | null;
  location: string | null;
  desiredConcept: string | null;
  status: InquiryStatus;
};

export type InquiryListResponse = {
  items: Inquiry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function listInquiries(page: number): Promise<InquiryListResponse> {
  const response = await requestAdminApi(`choidolsang/inquiries?page=${page}`);

  return (await response.json()) as InquiryListResponse;
}

const reservationFormatter = new Intl.DateTimeFormat('ko-KR', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  timeZone: 'Asia/Seoul',
  year: 'numeric',
});

/** 2026-11-20 → 2026.11.20 */
export function formatInquiryDate(date: string): string {
  return date.replaceAll('-', '.');
}

/** ISO 일시 → 2026.12.05 11:00 (한국 시간) */
export function formatReservationDateTime(isoDateTime: string): string {
  const parts = Object.fromEntries(
    reservationFormatter
      .formatToParts(new Date(isoDateTime))
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
