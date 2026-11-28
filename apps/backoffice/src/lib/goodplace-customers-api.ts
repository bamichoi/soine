import { requestAdminApi } from '@/lib/admin-auth-api';
import type { GoodplaceMeetingStatus } from '@/lib/goodplace-status';
import { type ListQuery, withListParams } from '@/lib/list-query';

export type GoodplaceCustomerSummary = {
  id: string;
  /** 고객 번호 */
  code: string;
  name: string;
  /** 연락처 (숫자만) */
  phone: string;
  meetingCount: number;
  createdAt: string;
};

export type GoodplaceCustomerDetail = Omit<GoodplaceCustomerSummary, 'meetingCount'> & {
  memo: string | null;
  /** 이 고객의 미팅 (미팅 일시 최근 순) */
  meetings: {
    code: string;
    title: string;
    status: GoodplaceMeetingStatus;
    meetAt: string;
  }[];
  updatedAt: string;
};

export type GoodplaceCustomerListResponse = {
  items: GoodplaceCustomerSummary[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type GoodplaceCustomerInput = { name: string; phone: string; memo?: string | null };

const PATH = 'goodplace/customers';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function listGoodplaceCustomers(
  query: ListQuery,
): Promise<GoodplaceCustomerListResponse> {
  const response = await requestAdminApi(withListParams(PATH, query));

  return (await response.json()) as GoodplaceCustomerListResponse;
}

/** 연락처로 기존 고객 찾기. 없으면 AdminApiError(404) */
export async function lookupGoodplaceCustomer(phone: string): Promise<GoodplaceCustomerSummary> {
  const response = await requestAdminApi(`${PATH}/lookup?${new URLSearchParams({ phone })}`);

  return (await response.json()) as GoodplaceCustomerSummary;
}

export async function getGoodplaceCustomer(code: string): Promise<GoodplaceCustomerDetail> {
  const response = await requestAdminApi(`${PATH}/${encodeURIComponent(code)}`);

  return (await response.json()) as GoodplaceCustomerDetail;
}

/** 같은 연락처의 고객이 있으면 AdminApiError(409) */
export async function createGoodplaceCustomer(
  input: GoodplaceCustomerInput,
): Promise<GoodplaceCustomerDetail> {
  const response = await requestAdminApi(PATH, {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'POST',
  });

  return (await response.json()) as GoodplaceCustomerDetail;
}

export async function updateGoodplaceCustomer(
  code: string,
  input: GoodplaceCustomerInput,
): Promise<GoodplaceCustomerDetail> {
  const response = await requestAdminApi(`${PATH}/${encodeURIComponent(code)}`, {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'PATCH',
  });

  return (await response.json()) as GoodplaceCustomerDetail;
}
