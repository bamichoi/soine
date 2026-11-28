import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { KkiruCustomerEdit } from '@/components/kkiru-customer-edit';
import { KkiruPageHead } from '@/components/kkiru-parts';
import { parseRouteCode } from '@/lib/kkiru-route';

export const metadata: Metadata = {
  title: '고객 수정 | 끼루',
};

export default async function KkiruCustomerEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = parseRouteCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">고객</h1>
      <div className="max-w-4xl">
        <KkiruPageHead title="고객 수정" />
        <KkiruCustomerEdit code={code} />
      </div>
    </div>
  );
}
