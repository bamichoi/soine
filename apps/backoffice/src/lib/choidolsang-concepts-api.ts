import { requestAdminApi } from '@/lib/admin-auth-api';

export const CONCEPT_NAME_MAX_LENGTH = 100;
/** 구성품 항목 수와 항목 하나의 길이 */
export const CONCEPT_COMPONENTS_MAX_COUNT = 50;
export const CONCEPT_COMPONENT_MAX_LENGTH = 200;
export const CONCEPT_PRICE_MAX = 100_000_000;

/** 돌상 컨셉. 고객에게 파는 돌상 세트 상품이다. */
export type Concept = {
  id: string;
  name: string;
  /** 구성품 목록 (추가한 순서) */
  components: string[];
  /** 가격 (원) */
  price: number;
  createdAt: string;
  updatedAt: string;
};

/** 다른 화면에서 컨셉을 고를 때 쓰는 짧은 항목 */
export type ConceptOption = {
  id: string;
  name: string;
  price: number;
};

export type ConceptListResponse = {
  items: Concept[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ConceptListQuery = {
  page: number;
  q: string;
};

export type ConceptInput = {
  name: string;
  components: string[];
  price: number;
};

export function parseConceptListQuery(params: URLSearchParams): ConceptListQuery {
  const page = Number.parseInt(params.get('page') ?? '', 10);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    q: (params.get('q') ?? '').trim().slice(0, 100),
  };
}

/** 기본값은 빼고 URL 검색 조건으로 바꾼다. */
export function toConceptListSearchParams(query: ConceptListQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.q) {
    params.set('q', query.q);
  }

  if (query.page > 1) {
    params.set('page', String(query.page));
  }

  return params;
}

const CONCEPTS_PATH = 'choidolsang/concepts';

function conceptPath(id: string): string {
  return `${CONCEPTS_PATH}/${encodeURIComponent(id)}`;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function listConcepts(query: ConceptListQuery): Promise<ConceptListResponse> {
  const params = toConceptListSearchParams(query).toString();
  const response = await requestAdminApi(params ? `${CONCEPTS_PATH}?${params}` : CONCEPTS_PATH);

  return (await response.json()) as ConceptListResponse;
}

/** 고를 수 있는 컨셉 전체 (이름순) */
export async function listConceptOptions(): Promise<ConceptOption[]> {
  const response = await requestAdminApi(`${CONCEPTS_PATH}/options`);

  return (await response.json()) as ConceptOption[];
}

export async function getConcept(id: string): Promise<Concept> {
  const response = await requestAdminApi(conceptPath(id));

  return (await response.json()) as Concept;
}

export async function createConcept(input: ConceptInput): Promise<Concept> {
  const response = await requestAdminApi(CONCEPTS_PATH, {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'POST',
  });

  return (await response.json()) as Concept;
}

export async function updateConcept(id: string, input: ConceptInput): Promise<Concept> {
  const response = await requestAdminApi(conceptPath(id), {
    body: JSON.stringify(input),
    headers: JSON_HEADERS,
    method: 'PATCH',
  });

  return (await response.json()) as Concept;
}

/** 숨김 삭제한다. 목록과 상세에서 더는 보이지 않는다. */
export async function deleteConcept(id: string): Promise<void> {
  await requestAdminApi(conceptPath(id), { method: 'DELETE' });
}

/** 250000 → 250,000원 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 주소의 컨셉 ID가 UUID 형식이면 소문자로, 아니면 null */
export function parseConceptId(rawId: string): string | null {
  return UUID_PATTERN.test(rawId) ? rawId.toLowerCase() : null;
}
