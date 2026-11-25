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
  /** 예약 번호. 예약을 만든 문의의 문의 번호와 같다. */
  code: string;
  /** 예약을 만든 문의의 문의 번호 */
  inquiryCode: string;
  customerName: string;
  /** 예약자 연락처 (숫자만) */
  customerPhone: string;
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

/** 예약 추가·수정에 공통으로 보내는 항목 */
export type ReservationFieldsInput = Omit<CreateReservationInput, 'inquiryCode'>;

export type CreateReservationInput = {
  inquiryCode: string;
  customerName: string;
  /** 숫자만 또는 하이픈 포함. 서버가 숫자만 저장한다. */
  customerPhone: string;
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

/** 예약중인 예약을 고친다. 완료·취소환불된 예약은 409 */
export async function updateReservation(
  code: string,
  input: ReservationFieldsInput,
): Promise<Reservation> {
  const response = await requestAdminApi(reservationPath(code), {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
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

/** 달력 칸에 표시할 짧은 예약 정보 */
export type ReservationCalendarItem = {
  code: string;
  eventAt: string;
  customerName: string;
  eventLocation: string;
  conceptName: string;
  status: ReservationStatus;
};

/** 한국 날짜 기준 [from, to) 기간의 예약중·완료 예약 (행사 시각 순) */
export async function listCalendarReservations(
  from: string,
  to: string,
): Promise<ReservationCalendarItem[]> {
  const params = new URLSearchParams({ from, to });
  const response = await requestAdminApi(`${RESERVATIONS_PATH}/calendar?${params}`);

  return (await response.json()) as ReservationCalendarItem[];
}
