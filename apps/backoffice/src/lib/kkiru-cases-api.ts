import { requestAdminApi } from '@/lib/admin-auth-api';
import type { KkiruListingOption } from '@/lib/kkiru-listings-api';
import type { KkiruContractStatus, KkiruMeetingStatus } from '@/lib/kkiru-status';
import { type ListQuery, type Paginated, withListParams } from '@/lib/list-query';

// 끼루 미팅·계약 API. 계약은 미팅의 케이스 번호를 함께 쓴다.

export type { Paginated } from '@/lib/list-query';

export type CustomerRef = { code: string; name: string; phone: string };

export type LogRecord = { id: string; recordedOn: string; content: string; createdAt: string };

/** 기록 추가·수정. listingId가 null이면 관련 매물 없음 (수정할 때는 연결을 끊는다) */
export type MeetingRecordInput = { recordedOn: string; content: string; listingId: string | null };

export type InflowSource = 'naver_land' | 'instagram' | 'other';

export const INFLOW_SOURCE_LABELS: Record<InflowSource, string> = {
  instagram: '인스타그램',
  // biome-ignore lint/style/useNamingConvention: API 값 그대로 쓴다.
  naver_land: '네이버부동산',
  other: '기타',
};

export type MeetingRecordKind = 'note' | 'stopped' | 'resumed' | 'contract_cancelled';

export const MEETING_RECORD_KIND_LABELS: Record<MeetingRecordKind, string | null> = {
  // biome-ignore lint/style/useNamingConvention: API 값 그대로 쓴다.
  contract_cancelled: '계약취소 사유',
  note: null,
  resumed: '미팅재개 사유',
  stopped: '진행중단 사유',
};

export type MeetingRecord = LogRecord & {
  kind: MeetingRecordKind;
  /** 관련 매물 (선택) */
  listing: { id: string; code: string; name: string } | null;
};

export type MeetingSummary = {
  id: string;
  /** 케이스 번호 */
  code: string;
  title: string;
  customer: CustomerRef;
  interestArea: string;
  desiredBusiness: string;
  budget: number;
  /** 미팅 일시 */
  meetAt: string;
  status: KkiruMeetingStatus;
};

export type MeetingContract = {
  id: string;
  contractedOn: string;
  status: KkiruContractStatus;
  listing: { id: string; code: string; name: string };
};

/** 미팅 매물. contractStatus는 이 매물로 이 미팅에서 만든 가장 최근 계약의 상태 */
export type MeetingListing = KkiruListingOption & {
  addedAt: string;
  contractStatus: KkiruContractStatus | null;
};

export type MeetingDetail = MeetingSummary & {
  desiredPyeongMin: number;
  desiredPyeongMax: number;
  desiredFloor: string;
  desiredRent: number;
  maxDeposit: number;
  maxPremium: number;
  inflowSource: InflowSource;
  inflowSourceDetail: string | null;
  stoppedAt: string | null;
  records: MeetingRecord[];
  listings: MeetingListing[];
  /** 이 미팅의 계약 (최근 순, 취소된 계약 포함) */
  contracts: MeetingContract[];
  /** 지금 새 계약을 만들 수 있는지 (미팅중이거나 계약이 취소된 뒤) */
  canStartContract: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MeetingFieldsInput = {
  title: string;
  interestArea: string;
  desiredBusiness: string;
  desiredPyeongMin: number;
  desiredPyeongMax: number;
  desiredFloor: string;
  desiredRent: number;
  maxDeposit: number;
  maxPremium: number;
  inflowSource: InflowSource;
  inflowSourceDetail: string | null;
  /** 미팅 일시 (시간대 포함 ISO 8601) */
  meetAt: string;
};

export type CreateMeetingInput = MeetingFieldsInput & {
  customerCode: string;
  content: string;
};

export type ContractSummary = {
  id: string;
  caseCode: string;
  contractedOn: string;
  customer: CustomerRef;
  listing: { code: string; name: string };
  commission: number;
  /** 잔금(만원) */
  balance: number;
  /** 잔금일 (YYYY-MM-DD) */
  balanceDueOn: string;
  status: KkiruContractStatus;
};

export type ContractDetail = Omit<ContractSummary, 'listing'> & {
  meeting: { code: string; title: string };
  listing: KkiruListingOption & { clientName: string; clientPhone: string };
  landlordName: string;
  landlordPhone: string;
  deposit: number;
  rent: number;
  premium: number;
  leaseStartOn: string;
  leaseEndOn: string;
  specialTerms: string | null;
  downPayment: number;
  isMyListing: boolean;
  isMyClient: boolean;
  cancelReason: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  /** 계약 히스토리: 이 계약이 속한 미팅의 로그 (날짜순) */
  history: MeetingRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ContractFieldsInput = {
  contractedOn: string;
  landlordSameAsClient: boolean;
  landlordName?: string;
  landlordPhone?: string;
  deposit: number;
  rent: number;
  premium: number;
  leaseStartOn: string;
  leaseEndOn: string;
  specialTerms: string | null;
  downPayment: number;
  balance: number;
  balanceDueOn: string;
  commission: number;
  isMyListing: boolean;
  isMyClient: boolean;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function getJson<T>(path: string): Promise<T> {
  return (await (await requestAdminApi(path)).json()) as T;
}

async function sendJson<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const response = await requestAdminApi(path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : JSON_HEADERS,
    method,
  });

  return (await response.json()) as T;
}

// 미팅
const MEETINGS = 'kkiru/meetings';
const meetingPath = (code: string) => `${MEETINGS}/${encodeURIComponent(code)}`;

export const listMeetings = (query: ListQuery) =>
  getJson<Paginated<MeetingSummary>>(withListParams(MEETINGS, query));
export const getMeeting = (code: string) => getJson<MeetingDetail>(meetingPath(code));
export const createMeeting = (input: CreateMeetingInput) =>
  sendJson<MeetingDetail>(MEETINGS, 'POST', input);
export const updateMeeting = (code: string, input: MeetingFieldsInput) =>
  sendJson<MeetingDetail>(meetingPath(code), 'PATCH', input);
export const addMeetingRecord = (code: string, input: MeetingRecordInput) =>
  sendJson<MeetingDetail>(`${meetingPath(code)}/records`, 'POST', input);
export const updateMeetingRecord = (code: string, recordId: string, input: MeetingRecordInput) =>
  sendJson<MeetingDetail>(`${meetingPath(code)}/records/${recordId}`, 'PATCH', input);
export const addMeetingListing = (code: string, listingId: string) =>
  sendJson<MeetingDetail>(`${meetingPath(code)}/listings`, 'POST', { listingId });
/** 미팅 매물 빼기: 미팅과 매물의 연결만 끊는다. 계약이 걸린 매물은 뺄 수 없다(409). */
export const removeMeetingListing = (code: string, listingId: string) =>
  sendJson<MeetingDetail>(`${meetingPath(code)}/listings/${listingId}`, 'DELETE');
export const stopMeeting = (code: string, reason: string) =>
  sendJson<MeetingDetail>(`${meetingPath(code)}/stop`, 'POST', { reason });
export const resumeMeeting = (code: string, reason: string) =>
  sendJson<MeetingDetail>(`${meetingPath(code)}/resume`, 'POST', { reason });

// 계약
const CONTRACTS = 'kkiru/contracts';

export const listContracts = (query: ListQuery) =>
  getJson<Paginated<ContractSummary>>(withListParams(CONTRACTS, query));
export const getContract = (id: string) => getJson<ContractDetail>(`${CONTRACTS}/${id}`);
/** 계약 진행: 미팅에서 매물 하나로 계약을 만든다. 미팅 매물에 없던 매물이면 함께 더한다. */
export const createContract = (
  input: ContractFieldsInput & { meetingCode: string; listingId: string },
) => sendJson<ContractDetail>(CONTRACTS, 'POST', input);
export const updateContract = (id: string, input: ContractFieldsInput) =>
  sendJson<ContractDetail>(`${CONTRACTS}/${id}`, 'PATCH', input);
export const completeContract = (id: string) =>
  sendJson<ContractDetail>(`${CONTRACTS}/${id}/complete`, 'POST');
export const cancelContract = (id: string, reason: string) =>
  sendJson<ContractDetail>(`${CONTRACTS}/${id}/cancel`, 'POST', { reason });
