import { requestAdminApi } from '@/lib/admin-auth-api';
import type { KkiruListingOption } from '@/lib/kkiru-listings-api';
import type {
  KkiruConsultationStatus,
  KkiruContractStatus,
  KkiruMeetingStatus,
} from '@/lib/kkiru-status';
import { type ListQuery, type Paginated, withListParams } from '@/lib/list-query';

// 끼루 상담·미팅·계약 API. 세 단계가 같은 케이스 번호를 쓴다.

export type { Paginated } from '@/lib/list-query';

export type CustomerRef = { code: string; name: string; phone: string };

export type LogRecord = { id: string; recordedOn: string; content: string; createdAt: string };

export type InflowSource = 'naver_land' | 'instagram' | 'other';

export const INFLOW_SOURCE_LABELS: Record<InflowSource, string> = {
  instagram: '인스타그램',
  // biome-ignore lint/style/useNamingConvention: API 값 그대로 쓴다.
  naver_land: '네이버부동산',
  other: '기타',
};

export type ConsultationSummary = {
  id: string;
  code: string;
  title: string;
  customer: CustomerRef;
  interestArea: string;
  desiredBusiness: string;
  budget: number;
  consultedOn: string;
  status: KkiruConsultationStatus;
};

export type ConsultationDetail = ConsultationSummary & {
  desiredPyeongMin: number;
  desiredPyeongMax: number;
  desiredFloor: string;
  desiredRent: number;
  maxDeposit: number;
  maxPremium: number;
  inflowSource: InflowSource;
  inflowSourceDetail: string | null;
  records: LogRecord[];
  listings: (KkiruListingOption & { addedAt: string })[];
  meetings: {
    id: string;
    listing: { code: string; name: string };
    meetAt: string;
    status: KkiruMeetingStatus;
    /** 이 미팅의 계약 (최근 순, 취소된 계약 포함) */
    contracts: { id: string; contractedOn: string; status: KkiruContractStatus }[];
  }[];
  createdAt: string;
  updatedAt: string;
};

export type ConsultationFieldsInput = {
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
  consultedOn: string;
};

export type CreateConsultationInput = ConsultationFieldsInput & {
  customerCode: string;
  content: string;
};

export type MeetingRecordKind = 'note' | 'stopped' | 'resumed' | 'contract_cancelled';

export const MEETING_RECORD_KIND_LABELS: Record<MeetingRecordKind, string | null> = {
  // biome-ignore lint/style/useNamingConvention: API 값 그대로 쓴다.
  contract_cancelled: '계약취소 사유',
  note: null,
  resumed: '미팅재개 사유',
  stopped: '진행중단 사유',
};

export type MeetingRecord = LogRecord & { kind: MeetingRecordKind };

export type MeetingSummary = {
  id: string;
  caseCode: string;
  consultationTitle: string;
  customer: CustomerRef;
  listing: { code: string; name: string };
  meetAt: string;
  status: KkiruMeetingStatus;
};

export type MeetingDetail = Omit<MeetingSummary, 'listing'> & {
  listing: KkiruListingOption & { clientName: string; clientPhone: string };
  records: MeetingRecord[];
  contracts: { id: string; contractedOn: string; status: KkiruContractStatus }[];
  canStartContract: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContractSummary = {
  id: string;
  caseCode: string;
  contractedOn: string;
  customer: CustomerRef;
  listing: { code: string; name: string };
  commission: number;
  status: KkiruContractStatus;
};

export type ContractHistoryEntry = {
  id: string;
  source: 'consultation' | 'meeting';
  kind: MeetingRecordKind;
  recordedOn: string;
  content: string;
};

export type ContractDetail = Omit<ContractSummary, 'listing'> & {
  consultation: { code: string; title: string };
  meetingId: string;
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
  history: ContractHistoryEntry[];
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

// 상담
const CONSULTATIONS = 'kkiru/consultations';
const consultationPath = (code: string) => `${CONSULTATIONS}/${encodeURIComponent(code)}`;

export const listConsultations = (query: ListQuery) =>
  getJson<Paginated<ConsultationSummary>>(withListParams(CONSULTATIONS, query));
export const getConsultation = (code: string) =>
  getJson<ConsultationDetail>(consultationPath(code));
export const createConsultation = (input: CreateConsultationInput) =>
  sendJson<ConsultationDetail>(CONSULTATIONS, 'POST', input);
export const updateConsultation = (code: string, input: ConsultationFieldsInput) =>
  sendJson<ConsultationDetail>(consultationPath(code), 'PATCH', input);
export const addConsultationRecord = (
  code: string,
  input: { recordedOn: string; content: string },
) => sendJson<ConsultationDetail>(`${consultationPath(code)}/records`, 'POST', input);
export const updateConsultationRecord = (
  code: string,
  recordId: string,
  input: { recordedOn: string; content: string },
) => sendJson<ConsultationDetail>(`${consultationPath(code)}/records/${recordId}`, 'PATCH', input);
export const addConsultationListing = (code: string, listingId: string) =>
  sendJson<ConsultationDetail>(`${consultationPath(code)}/listings`, 'POST', { listingId });
/** 상담매물 빼기: 상담과 매물의 연결만 끊는다. */
export const removeConsultationListing = (code: string, listingId: string) =>
  sendJson<ConsultationDetail>(`${consultationPath(code)}/listings/${listingId}`, 'DELETE');

// 미팅
const MEETINGS = 'kkiru/meetings';

export const listMeetings = (query: ListQuery) =>
  getJson<Paginated<MeetingSummary>>(withListParams(MEETINGS, query));
export const getMeeting = (id: string) => getJson<MeetingDetail>(`${MEETINGS}/${id}`);
export const createMeeting = (input: {
  consultationCode: string;
  listingId: string;
  meetAt: string;
  content: string;
}) => sendJson<MeetingDetail>(MEETINGS, 'POST', input);
export const updateMeeting = (id: string, input: { listingId: string; meetAt: string }) =>
  sendJson<MeetingDetail>(`${MEETINGS}/${id}`, 'PATCH', input);
export const addMeetingRecord = (id: string, input: { recordedOn: string; content: string }) =>
  sendJson<MeetingDetail>(`${MEETINGS}/${id}/records`, 'POST', input);
export const updateMeetingRecord = (
  id: string,
  recordId: string,
  input: { recordedOn: string; content: string },
) => sendJson<MeetingDetail>(`${MEETINGS}/${id}/records/${recordId}`, 'PATCH', input);
export const stopMeeting = (id: string, reason: string) =>
  sendJson<MeetingDetail>(`${MEETINGS}/${id}/stop`, 'POST', { reason });
export const resumeMeeting = (id: string, reason: string) =>
  sendJson<MeetingDetail>(`${MEETINGS}/${id}/resume`, 'POST', { reason });

// 계약
const CONTRACTS = 'kkiru/contracts';

export const listContracts = (query: ListQuery) =>
  getJson<Paginated<ContractSummary>>(withListParams(CONTRACTS, query));
export const getContract = (id: string) => getJson<ContractDetail>(`${CONTRACTS}/${id}`);
export const createContract = (input: ContractFieldsInput & { meetingId: string }) =>
  sendJson<ContractDetail>(CONTRACTS, 'POST', input);
export const updateContract = (id: string, input: ContractFieldsInput) =>
  sendJson<ContractDetail>(`${CONTRACTS}/${id}`, 'PATCH', input);
export const completeContract = (id: string) =>
  sendJson<ContractDetail>(`${CONTRACTS}/${id}/complete`, 'POST');
export const cancelContract = (id: string, reason: string) =>
  sendJson<ContractDetail>(`${CONTRACTS}/${id}/cancel`, 'POST', { reason });
