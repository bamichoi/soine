import { requestAdminApi } from '@/lib/admin-auth-api';

export const INQUIRY_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

// 예약확정은 예약을 만들 때, 취소는 예약을 취소할 때만 바뀌므로 문의를 추가할 때는 대기·거절만 고른다.
export const CREATABLE_INQUIRY_STATUSES = ['pending', 'rejected'] as const;

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  cancelled: '취소',
  confirmed: '예약확정',
  pending: '대기',
  rejected: '거절',
};

export const INQUIRY_CONTENT_MAX_LENGTH = 5000;
export const INQUIRY_SHORT_TEXT_MAX_LENGTH = 200;
export const REJECTION_REASON_MAX_LENGTH = 1000;

/** 문의가 참조하는 돌상 컨셉 */
export type InquiryConceptRef = {
  id: string;
  name: string;
  isDeleted: boolean;
};

export type Inquiry = {
  id: string;
  /** 문의 번호 (무작위 코드) */
  code: string;
  /** 문의 날짜 (YYYY-MM-DD) */
  inquiredOn: string;
  content: string;
  /** 희망 예약 일시 (ISO 8601) */
  desiredReservationAt: string | null;
  location: string | null;
  /** 희망 돌상 컨셉. 숨김 삭제된 컨셉이면 isDeleted가 true */
  desiredConcept: InquiryConceptRef | null;
  status: InquiryStatus;
};

/** 문의 내용 로그의 기록 하나. 첫 기록이 첫 문의다. */
export type InquiryRecord = {
  id: string;
  /** 기록 날짜 (YYYY-MM-DD) */
  recordedOn: string;
  content: string;
  createdAt: string;
};

export type InquiryDetail = Inquiry & {
  /** 문의 내용 로그. 오래된 것부터. */
  records: InquiryRecord[];
  /** 거절 사유. 거절 상태일 때만 값이 있다. */
  rejectionReason: string | null;
  /** 이 문의로 만든 예약의 예약 번호. 없으면 null */
  reservationCode: string | null;
  createdAt: string;
  updatedAt: string;
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

export const INQUIRY_SEARCH_FIELDS = [
  'all',
  'code',
  'content',
  'location',
  'desiredConcept',
  'status',
] as const;
export type InquirySearchField = (typeof INQUIRY_SEARCH_FIELDS)[number];

export const INQUIRY_SEARCH_FIELD_LABELS: Record<InquirySearchField, string> = {
  all: '전체 항목',
  code: '문의 번호',
  content: '문의 내용',
  desiredConcept: '희망 돌상 컨셉',
  location: '장소',
  status: '상태',
};

export const INQUIRY_SORT_FIELDS = [
  'inquiredOn',
  'desiredReservationAt',
  'location',
  'desiredConcept',
  'status',
] as const;
export type InquirySortField = (typeof INQUIRY_SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export type InquiryListQuery = {
  page: number;
  field: InquirySearchField;
  q: string;
  sort: InquirySortField;
  order: SortOrder;
};

export const DEFAULT_INQUIRY_LIST_QUERY: InquiryListQuery = {
  field: 'all',
  order: 'desc',
  page: 1,
  q: '',
  sort: 'inquiredOn',
};

function isOneOf<T extends string>(values: readonly T[], value: string | null): value is T {
  return value !== null && (values as readonly string[]).includes(value);
}

/** URL 검색 파라미터 → 목록 조회 조건. 잘못된 값은 기본값으로 바꾼다. */
export function parseInquiryListQuery(params: URLSearchParams): InquiryListQuery {
  const page = Number(params.get('page'));
  const field = params.get('field');
  const sort = params.get('sort');
  const order = params.get('order');

  return {
    field: isOneOf(INQUIRY_SEARCH_FIELDS, field) ? field : DEFAULT_INQUIRY_LIST_QUERY.field,
    order: order === 'asc' || order === 'desc' ? order : DEFAULT_INQUIRY_LIST_QUERY.order,
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULT_INQUIRY_LIST_QUERY.page,
    q: params.get('q')?.slice(0, 100) ?? '',
    sort: isOneOf(INQUIRY_SORT_FIELDS, sort) ? sort : DEFAULT_INQUIRY_LIST_QUERY.sort,
  };
}

/** 목록 조회 조건 → URL 검색 파라미터. 기본값은 생략한다. */
export function toInquiryListSearchParams(query: InquiryListQuery): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of ['page', 'field', 'q', 'sort', 'order'] as const) {
    if (query[key] !== DEFAULT_INQUIRY_LIST_QUERY[key] && query[key] !== '') {
      params.set(key, String(query[key]));
    }
  }

  return params;
}

export async function listInquiries(query: InquiryListQuery): Promise<InquiryListResponse> {
  const params = toInquiryListSearchParams(query);
  const response = await requestAdminApi(`choidolsang/inquiries?${params.toString()}`);

  return (await response.json()) as InquiryListResponse;
}

export async function getInquiry(code: string): Promise<InquiryDetail> {
  const response = await requestAdminApi(`choidolsang/inquiries/${encodeURIComponent(code)}`);

  return (await response.json()) as InquiryDetail;
}

export type CreateInquiryInput = {
  inquiredOn: string;
  content: string;
  desiredReservationAt: string | null;
  location: string | null;
  /** 희망 돌상 컨셉 ID */
  desiredConceptId: string | null;
  status: InquiryStatus;
  /** 상태가 거절일 때만 보낸다. */
  rejectionReason: string | null;
};

export async function createInquiry(input: CreateInquiryInput): Promise<InquiryDetail> {
  const response = await requestAdminApi('choidolsang/inquiries', {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  return (await response.json()) as InquiryDetail;
}

const seoulDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
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
export function formatSeoulDateTime(isoDateTime: string): string {
  const parts = Object.fromEntries(
    seoulDateTimeFormatter
      .formatToParts(new Date(isoDateTime))
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

/** 한국 기준 오늘 날짜 (YYYY-MM-DD) */
export function getSeoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/** 문의 내용의 첫 줄 */
export function getFirstLine(text: string): string {
  return text.split(/\r?\n/).find((line) => line.trim() !== '') ?? '';
}

/** 대기 중인 문의를 거절한다. 대기가 아니면 409. */
export async function rejectInquiry(code: string, reason: string): Promise<InquiryDetail> {
  const response = await requestAdminApi(
    `choidolsang/inquiries/${encodeURIComponent(code)}/reject`,
    {
      body: JSON.stringify({ reason }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );

  return (await response.json()) as InquiryDetail;
}

/** 거절한 문의를 다시 대기로 돌린다. 거절 상태가 아니면 409. */
export async function reopenInquiry(code: string): Promise<InquiryDetail> {
  const response = await requestAdminApi(
    `choidolsang/inquiries/${encodeURIComponent(code)}/reopen`,
    { method: 'POST' },
  );

  return (await response.json()) as InquiryDetail;
}

/**
 * 문의 수정. 상태와 문의 날짜·내용(로그)은 바꾸지 않는다.
 * 거절 사유는 거절된 문의일 때만 보낸다.
 */
export type UpdateInquiryInput = Pick<
  CreateInquiryInput,
  'desiredReservationAt' | 'location' | 'desiredConceptId'
> & {
  rejectionReason?: string;
};

export async function updateInquiry(
  code: string,
  input: UpdateInquiryInput,
): Promise<InquiryDetail> {
  const response = await requestAdminApi(`choidolsang/inquiries/${encodeURIComponent(code)}`, {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });

  return (await response.json()) as InquiryDetail;
}

/** 문의를 숨김 삭제한다. 목록과 상세에서 더는 보이지 않는다. */
export async function deleteInquiry(code: string): Promise<void> {
  await requestAdminApi(`choidolsang/inquiries/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
}

/** ISO 일시 → 한국 시간 날짜(YYYY-MM-DD)와 시각(HH:mm). 수정 폼 입력값에 쓴다. */
export function toSeoulDateAndTime(isoDateTime: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    seoulDateTimeFormatter
      .formatToParts(new Date(isoDateTime))
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export type InquiryRecordInput = {
  recordedOn: string;
  content: string;
};

/** 문의 내용 로그에 기록을 덧붙인다. */
export async function addInquiryRecord(
  code: string,
  input: InquiryRecordInput,
): Promise<InquiryDetail> {
  const response = await requestAdminApi(
    `choidolsang/inquiries/${encodeURIComponent(code)}/records`,
    {
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );

  return (await response.json()) as InquiryDetail;
}

function recordPath(code: string, recordId: string): string {
  return `choidolsang/inquiries/${encodeURIComponent(code)}/records/${encodeURIComponent(recordId)}`;
}

/** 로그의 기록 하나를 고친다. */
export async function updateInquiryRecord(
  code: string,
  recordId: string,
  input: InquiryRecordInput,
): Promise<InquiryDetail> {
  const response = await requestAdminApi(recordPath(code, recordId), {
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  });

  return (await response.json()) as InquiryDetail;
}

/** 로그의 기록 하나를 완전히 지운다. 마지막 남은 기록은 지울 수 없다(409). */
export async function deleteInquiryRecord(code: string, recordId: string): Promise<InquiryDetail> {
  const response = await requestAdminApi(recordPath(code, recordId), { method: 'DELETE' });

  return (await response.json()) as InquiryDetail;
}
