import { requestAdminApi } from '@/lib/admin-auth-api';

export const RESERVATION_STATUSES = ['reserved', 'cancelled', 'completed'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  cancelled: '취소환불',
  completed: '완료',
  reserved: '예약중',
};

export const BABY_GENDERS = ['boy', 'girl'] as const;
export type BabyGender = (typeof BABY_GENDERS)[number];

export const BABY_GENDER_LABELS: Record<BabyGender, string> = {
  boy: '남아',
  girl: '여아',
};

export const DEFAULT_DEPOSIT_AMOUNT = 50_000;
export const RESERVATION_AMOUNT_MAX = 100_000_000;
export const EXTRA_COMPONENTS_MAX_COUNT = 50;
export const EXTRA_COMPONENT_MAX_LENGTH = 200;
export const RESERVATION_REQUESTS_MAX_LENGTH = 2000;

export type Reservation = {
  id: string;
  /** 예약 번호 */
  code: string;
  /** 예약을 만든 문의의 문의 번호 */
  inquiryCode: string;
  customerName: string;
  /** 행사 날짜·시간 (ISO 8601) */
  eventAt: string;
  eventLocation: string;
  babyName: string;
  babyGender: BabyGender;
  concept: { id: string; name: string; isDeleted: boolean };
  guestCount: number;
  hasSnap: boolean;
  requests: string | null;
  extraComponents: string[];
  totalAmount: number;
  depositAmount: number;
  /** 잔금 = 최종 결제 금액 - 예약금 */
  balanceAmount: number;
  /** 예약 확정 날짜 (YYYY-MM-DD) */
  confirmedOn: string;
  status: ReservationStatus;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReservationListResponse = {
  items: Reservation[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type CreateReservationInput = {
  inquiryCode: string;
  customerName: string;
  eventAt: string;
  eventLocation: string;
  babyName: string;
  babyGender: BabyGender;
  conceptId: string;
  guestCount: number;
  hasSnap: boolean;
  requests: string | null;
  extraComponents: string[];
  totalAmount: number;
  depositAmount: number;
  confirmedOn: string;
};

const RESERVATIONS_PATH = 'choidolsang/reservations';

function reservationPath(code: string): string {
  return `${RESERVATIONS_PATH}/${encodeURIComponent(code)}`;
}

export async function listReservations(page: number): Promise<ReservationListResponse> {
  const response = await requestAdminApi(
    page > 1 ? `${RESERVATIONS_PATH}?page=${page}` : RESERVATIONS_PATH,
  );

  return (await response.json()) as ReservationListResponse;
}

export async function getReservation(code: string): Promise<Reservation> {
  const response = await requestAdminApi(reservationPath(code));

  return (await response.json()) as Reservation;
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const response = await requestAdminApi(RESERVATIONS_PATH, {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return (await response.json()) as Reservation;
}

/** 예약 취소: 예약은 취소환불, 이어진 문의는 취소로 바뀐다. */
export async function cancelReservation(code: string): Promise<Reservation> {
  const response = await requestAdminApi(`${reservationPath(code)}/cancel`, { method: 'POST' });

  return (await response.json()) as Reservation;
}

/** 업무 완료: 예약이 완료로 바뀐다. 나중에 매출에 반영된다. */
export async function completeReservation(code: string): Promise<Reservation> {
  const response = await requestAdminApi(`${reservationPath(code)}/complete`, { method: 'POST' });

  return (await response.json()) as Reservation;
}
