import { requestAdminApi } from '@/lib/admin-auth-api';

/** 매출 조회 기간: 한 달(YYYY-MM) 또는 한 해(YYYY) */
export type SalesPeriod = { kind: 'month'; key: string } | { kind: 'year'; key: string };

export type SalesSummary = {
  period: SalesPeriod;
  totalAmount: number;
  count: number;
  averageAmount: number;
  previousTotalAmount: number;
  /** 앞 기간 대비 증감률(%). 앞 기간 매출이 0이면 null */
  changeRate: number | null;
  /** 이 기간에 행사가 있는 예약중 예약 */
  expected: { totalAmount: number; count: number };
  trend: { month: string; totalAmount: number; count: number }[];
  byConcept: {
    conceptId: string;
    name: string;
    isDeleted: boolean;
    count: number;
    totalAmount: number;
    share: number;
  }[];
};

export type SalesItem = {
  code: string;
  completedAt: string;
  eventAt: string;
  customerName: string;
  conceptName: string;
  totalAmount: number;
};

export type SalesItemsResponse = {
  items: SalesItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

function periodParams(period: SalesPeriod): URLSearchParams {
  return new URLSearchParams(
    period.kind === 'month' ? { month: period.key } : { year: period.key },
  );
}

export async function getSalesSummary(period: SalesPeriod): Promise<SalesSummary> {
  const response = await requestAdminApi(`choidolsang/sales/summary?${periodParams(period)}`);

  return (await response.json()) as SalesSummary;
}

export async function listSalesItems(
  period: SalesPeriod,
  page: number,
): Promise<SalesItemsResponse> {
  const params = periodParams(period);

  if (page > 1) {
    params.set('page', String(page));
  }

  const response = await requestAdminApi(`choidolsang/sales/items?${params}`);

  return (await response.json()) as SalesItemsResponse;
}
