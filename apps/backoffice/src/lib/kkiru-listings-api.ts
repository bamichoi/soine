import { requestAdminApi } from '@/lib/admin-auth-api';
import type {
  KkiruContractStatus,
  KkiruListingStatus,
  KkiruMeetingStatus,
} from '@/lib/kkiru-status';
import { type ListQuery, withListParams } from '@/lib/list-query';

export type KkiruListing = {
  id: string;
  /** 매물 번호 */
  code: string;
  name: string;
  address: string;
  /** 면적(㎡) */
  areaM2: number;
  floor: string;
  /** 임대료·보증금·권리금 (만원) */
  rent: number;
  deposit: number;
  premium: number;
  hasParking: boolean | null;
  restroomCount: number | null;
  features: string | null;
  clientName: string;
  clientPhone: string;
  status: KkiruListingStatus;
  createdAt: string;
  updatedAt: string;
};

/** 이 매물이 미팅 매물로 걸린 미팅. contract는 이 미팅에서 이 매물로 맺은 가장 최근 계약 */
export type KkiruListingMeeting = {
  /** 케이스 번호 */
  code: string;
  title: string;
  customer: { name: string };
  meetAt: string;
  status: KkiruMeetingStatus;
  contract: { id: string; status: KkiruContractStatus; contractedOn: string } | null;
};

/** 매물 상세 응답: 이 매물로 한 미팅 내역(최근 미팅 먼저, 계약취소 포함)을 함께 준다. */
export type KkiruListingDetail = KkiruListing & { meetings: KkiruListingMeeting[] };

export type KkiruListingOption = Pick<
  KkiruListing,
  | 'id'
  | 'code'
  | 'name'
  | 'address'
  | 'areaM2'
  | 'floor'
  | 'rent'
  | 'deposit'
  | 'premium'
  | 'status'
>;

export type KkiruListingListResponse = {
  items: KkiruListing[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type KkiruListingInput = Omit<
  KkiruListing,
  'id' | 'code' | 'status' | 'createdAt' | 'updatedAt'
>;

const PATH = 'kkiru/listings';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function listKkiruListings(query: ListQuery): Promise<KkiruListingListResponse> {
  const response = await requestAdminApi(withListParams(PATH, query));

  return (await response.json()) as KkiruListingListResponse;
}

/** 고를 수 있는(계약완료가 아닌) 매물을 번호·이름·주소로 찾는다. */
export async function searchKkiruListingOptions(q: string): Promise<KkiruListingOption[]> {
  const response = await requestAdminApi(`${PATH}/options?${new URLSearchParams({ q })}`);

  return (await response.json()) as KkiruListingOption[];
}

export async function getKkiruListing(code: string): Promise<KkiruListingDetail> {
  const response = await requestAdminApi(`${PATH}/${encodeURIComponent(code)}`);

  return (await response.json()) as KkiruListingDetail;
}

export async function createKkiruListing(input: KkiruListingInput): Promise<KkiruListing> {
  const response = await requestAdminApi(PATH, {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'POST',
  });

  return (await response.json()) as KkiruListing;
}

export async function updateKkiruListing(
  code: string,
  input: KkiruListingInput,
): Promise<KkiruListing> {
  const response = await requestAdminApi(`${PATH}/${encodeURIComponent(code)}`, {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'PATCH',
  });

  return (await response.json()) as KkiruListing;
}
