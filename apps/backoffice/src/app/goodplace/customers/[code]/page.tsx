import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackToListLink } from '@/components/back-to-list-link';
import { GoodplaceCustomerDetailView } from '@/components/goodplace-customer-detail';
import { parseRouteCode } from '@/lib/goodplace-route';

export const metadata: Metadata = {
  title: '고객 상세 | 굿플레이스',
};

export default async function GoodplaceCustomerDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = parseRouteCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">고객</h1>
      <div className="max-w-4xl">
        <div className="mb-2 md:hidden">
          <BackToListLink href="/goodplace/customers" />
        </div>
        <GoodplaceCustomerDetailView code={code} />
      </div>
    </div>
  );
}
