import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChoidolsangReservationCreate } from '@/components/choidolsang-reservation-form';
import { PageTitleBar } from '@/components/page-title-bar';

export const metadata: Metadata = {
  title: '예약 확정 | 초이돌상',
};

type NewReservationPageProps = {
  searchParams: Promise<{ inquiry?: string | string[] }>;
};

// 예약은 항상 문의에서 만든다. 주소의 inquiry에 문의 번호가 온다.
export default async function ChoidolsangNewReservationPage({
  searchParams,
}: NewReservationPageProps) {
  const rawCode = (await searchParams).inquiry;
  const inquiryCode = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';

  if (!/^[0-9A-Z]{1,16}$/.test(inquiryCode)) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">예약</h1>
      <div className="flex max-w-3xl flex-col gap-4">
        <PageTitleBar title="예약 확정" />
        <ChoidolsangReservationCreate inquiryCode={inquiryCode} />
      </div>
    </div>
  );
}
