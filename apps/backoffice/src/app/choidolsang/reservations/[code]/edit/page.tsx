import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChoidolsangReservationEdit } from '@/components/choidolsang-reservation-form';
import { PageHead } from '@/components/page-parts';

type ReservationEditPageProps = {
  params: Promise<{ code: string }>;
};

function parseCode(rawCode: string): string | null {
  const code = rawCode.toUpperCase();

  return /^[0-9A-Z]{1,16}$/.test(code) ? code : null;
}

export async function generateMetadata({ params }: ReservationEditPageProps): Promise<Metadata> {
  const { code } = await params;

  return { title: `예약 ${parseCode(code) ?? ''} 수정 | 초이돌상` };
}

export default async function ChoidolsangReservationEditPage({ params }: ReservationEditPageProps) {
  const code = parseCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">예약</h1>
      <div className="max-w-4xl">
        <PageHead title="예약 수정" />
        <ChoidolsangReservationEdit code={code} />
      </div>
    </div>
  );
}
