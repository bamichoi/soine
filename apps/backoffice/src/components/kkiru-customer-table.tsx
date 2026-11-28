'use client';

import { CopyCodeButton } from '@/components/copy-code-button';
import { type ListColumn, ListTable } from '@/components/list-table';
import { formatInquiryDate } from '@/lib/choidolsang-inquiries-api';
import { type KkiruCustomerSummary, listKkiruCustomers } from '@/lib/kkiru-customers-api';
import { formatPhone } from '@/lib/phone';

const COLUMNS: ListColumn<KkiruCustomerSummary>[] = [
  { key: 'code', label: '고객 번호', render: () => null },
  {
    key: 'name',
    label: '이름',
    render: (c) => <span className="whitespace-nowrap">{c.name}</span>,
    sortField: 'name',
  },
  {
    key: 'phone',
    label: '연락처',
    render: (c) => <span className="whitespace-nowrap tabular-nums">{formatPhone(c.phone)}</span>,
    sortField: 'phone',
  },
  {
    firstOrder: 'desc',
    key: 'consultationCount',
    label: '상담',
    render: (c) => <span className="whitespace-nowrap tabular-nums">{c.consultationCount}건</span>,
    sortField: 'consultationCount',
  },
  {
    firstOrder: 'desc',
    key: 'createdAt',
    label: '등록일',
    render: (c) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatInquiryDate(c.createdAt.slice(0, 10))}
      </span>
    ),
    sortField: 'createdAt',
  },
];

export function KkiruCustomerTable() {
  return (
    <ListTable
      addLink={{ href: '/kkiru/customers/new', label: '새 고객' }}
      columns={COLUMNS}
      defaultSort={{ field: 'createdAt', order: 'desc' }}
      emptyText="아직 등록된 고객이 없습니다."
      load={listKkiruCustomers}
      minWidth="40rem"
      rowLink={(c) => ({
        extra: <CopyCodeButton code={c.code} label="고객 번호" />,
        href: `/kkiru/customers/${c.code}`,
        label: `고객 ${c.name} 상세 보기`,
        text: c.code,
      })}
      searchFields={[
        { label: '이름', value: 'name' },
        { label: '연락처', value: 'phone' },
        { label: '고객 번호', value: 'code' },
      ]}
      title="고객"
      unit="명"
    />
  );
}
