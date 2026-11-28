'use client';

import { useSearchParams } from 'next/navigation';
import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruConsultationForm } from '@/components/kkiru-consultation-form';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { type ListColumn, ListTable } from '@/components/list-table';
import { formatInquiryDate } from '@/lib/choidolsang-inquiries-api';
import {
  type ConsultationSummary,
  getConsultation,
  listConsultations,
} from '@/lib/kkiru-cases-api';
import { formatManwon } from '@/lib/kkiru-format';
import { CONSULTATION_STATUS_LABELS, type KkiruConsultationStatus } from '@/lib/kkiru-status';
import { formatPhone } from '@/lib/phone';

const COLUMNS: ListColumn<ConsultationSummary>[] = [
  { key: 'code', label: '케이스 번호', render: () => null },
  {
    firstOrder: 'desc',
    key: 'consultedOn',
    sortField: 'consultedOn',
    label: '상담일',
    render: (c) => <span className="tabular-nums">{formatInquiryDate(c.consultedOn)}</span>,
  },
  {
    key: 'title',
    sortField: 'title',
    label: '제목',
    render: (c) => (
      <p className="max-w-[22rem] truncate" title={c.title}>
        {c.title}
      </p>
    ),
  },
  {
    key: 'customer',
    sortField: 'customer',
    label: '고객',
    render: (c) => <span className="whitespace-nowrap">{c.customer.name}</span>,
  },
  {
    key: 'phone',
    label: '연락처',
    render: (c) => (
      <span className="whitespace-nowrap tabular-nums">{formatPhone(c.customer.phone)}</span>
    ),
  },
  {
    key: 'area',
    sortField: 'interestArea',
    label: '관심 상권',
    render: (c) => <span className="whitespace-nowrap">{c.interestArea}</span>,
  },
  {
    key: 'business',
    sortField: 'desiredBusiness',
    label: '희망 업종',
    render: (c) => <span className="whitespace-nowrap">{c.desiredBusiness}</span>,
  },
  {
    align: 'right',
    key: 'budget',
    label: '예산',
    render: (c) => formatManwon(c.budget),
  },
  {
    key: 'status',
    sortField: 'status',
    label: '상태',
    render: (c) => (
      <KkiruStatusBadge label={CONSULTATION_STATUS_LABELS[c.status]} status={c.status} />
    ),
  },
];

const STATUS_OPTIONS = (Object.keys(CONSULTATION_STATUS_LABELS) as KkiruConsultationStatus[]).map(
  (value) => ({
    label: CONSULTATION_STATUS_LABELS[value],
    value,
  }),
);

export function KkiruConsultationTable() {
  return (
    <ListTable
      addLink={{ href: '/kkiru/consultations/new', label: '새 상담' }}
      columns={COLUMNS}
      emptyText="아직 상담이 없습니다."
      load={listConsultations}
      minWidth="68rem"
      rowLink={(c) => ({
        extra: <CopyCodeButton code={c.code} label="케이스 번호" />,
        href: `/kkiru/consultations/${c.code}`,
        label: `상담 ${c.title} 상세 보기`,
        text: c.code,
      })}
      defaultSort={{ field: 'consultedOn', order: 'desc' }}
      searchFields={[
        { label: '케이스 번호', value: 'code' },
        { label: '제목', value: 'title' },
        { label: '고객', value: 'customer' },
        { label: '연락처', value: 'phone' },
        { label: '관심 상권', value: 'interestArea' },
        { label: '희망 업종', value: 'desiredBusiness' },
      ]}
      statusOptions={STATUS_OPTIONS}
      title="상담"
      unit="건"
    />
  );
}

export function KkiruNewConsultation() {
  const searchParams = useSearchParams();
  return <KkiruConsultationForm initialCustomerCode={searchParams.get('customer')} />;
}

export function KkiruConsultationEdit({ code }: { code: string }) {
  return (
    <KkiruLoader load={getConsultation} loadKey={code} noun="상담">
      {(consultation) => <KkiruConsultationForm consultation={consultation} />}
    </KkiruLoader>
  );
}
