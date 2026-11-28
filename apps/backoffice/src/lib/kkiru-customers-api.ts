import { requestAdminApi } from '@/lib/admin-auth-api';
import type { KkiruMeetingStatus } from '@/lib/kkiru-status';
import { type ListQuery, withListParams } from '@/lib/list-query';

export type KkiruCustomerSummary = {
  id: string;
  /** 고객 번호 */
  code: string;
  name: string;
  /** 연락처 (숫자만) */
  phone: string;
  meetingCount: number;
  createdAt: string;
};

export type KkiruCustomerDetail = Omit<KkiruCustomerSummary, 'meetingCount'> & {
  memo: string | null;
  /** 이 고객의 미팅 (미팅 일시 최근 순) */
  meetings: {
    code: string;
    title: string;
    status: KkiruMeetingStatus;
    meetAt: string;
  }[];
  updatedAt: string;
};

export type KkiruCustomerListResponse = {
  items: KkiruCustomerSummary[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type KkiruCustomerInput = { name: string; phone: string; memo?: string | null };

const PATH = 'kkiru/customers';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function listKkiruCustomers(query: ListQuery): Promise<KkiruCustomerListResponse> {
  const response = await requestAdminApi(withListParams(PATH, query));

  return (await response.json()) as KkiruCustomerListResponse;
}

/** 연락처로 기존 고객 찾기. 없으면 AdminApiError(404) */
export async function lookupKkiruCustomer(phone: string): Promise<KkiruCustomerSummary> {
  const response = await requestAdminApi(`${PATH}/lookup?${new URLSearchParams({ phone })}`);

  return (await response.json()) as KkiruCustomerSummary;
}

export async function getKkiruCustomer(code: string): Promise<KkiruCustomerDetail> {
  const response = await requestAdminApi(`${PATH}/${encodeURIComponent(code)}`);

  return (await response.json()) as KkiruCustomerDetail;
}

/** 같은 연락처의 고객이 있으면 AdminApiError(409) */
export async function createKkiruCustomer(input: KkiruCustomerInput): Promise<KkiruCustomerDetail> {
  const response = await requestAdminApi(PATH, {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'POST',
  });

  return (await response.json()) as KkiruCustomerDetail;
}

export async function updateKkiruCustomer(
  code: string,
  input: KkiruCustomerInput,
): Promise<KkiruCustomerDetail> {
  const response = await requestAdminApi(`${PATH}/${encodeURIComponent(code)}`, {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'PATCH',
  });

  return (await response.json()) as KkiruCustomerDetail;
}
