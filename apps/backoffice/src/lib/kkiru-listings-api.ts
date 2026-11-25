import { requestAdminApi } from '@/lib/admin-auth-api';
import type { KkiruListingStatus } from '@/lib/kkiru-status';

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

export async function listKkiruListings(
  page: number,
  q: string,
  status: KkiruListingStatus | null,
): Promise<KkiruListingListResponse> {
  const params = new URLSearchParams();

  if (q) {
    params.set('q', q);
  }

  if (status) {
    params.set('status', status);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const query = params.toString();
  const response = await requestAdminApi(query ? `${PATH}?${query}` : PATH);

  return (await response.json()) as KkiruListingListResponse;
}

/** 고를 수 있는(계약가능) 매물을 번호·이름·주소로 찾는다. */
export async function searchKkiruListingOptions(q: string): Promise<KkiruListingOption[]> {
  const response = await requestAdminApi(`${PATH}/options?${new URLSearchParams({ q })}`);

  return (await response.json()) as KkiruListingOption[];
}

export async function getKkiruListing(code: string): Promise<KkiruListing> {
  const response = await requestAdminApi(`${PATH}/${encodeURIComponent(code)}`);

  return (await response.json()) as KkiruListing;
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
