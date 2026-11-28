'use client';

import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { type ListColumn, ListTable } from '@/components/list-table';
import { formatArea, formatManwon } from '@/lib/kkiru-format';
import { type KkiruListing, listKkiruListings } from '@/lib/kkiru-listings-api';
import { LISTING_STATUS_LABELS, LISTING_STATUSES } from '@/lib/kkiru-status';

const COLUMNS: ListColumn<KkiruListing>[] = [
  { key: 'code', label: '매물 번호', render: () => null },
  {
    key: 'name',
    label: '매물 이름',
    render: (l) => (
      <p className="max-w-[22rem] truncate" title={l.name}>
        {l.name}
      </p>
    ),
    sortField: 'name',
  },
  {
    key: 'address',
    label: '주소',
    render: (l) => (
      <p className="max-w-[22rem] truncate" title={l.address}>
        {l.address}
      </p>
    ),
    sortField: 'address',
  },
  {
    firstOrder: 'desc',
    key: 'area',
    label: '면적',
    render: (l) => <span className="whitespace-nowrap tabular-nums">{formatArea(l.areaM2)}</span>,
    sortField: 'areaM2',
  },
  {
    key: 'floor',
    label: '층',
    render: (l) => <span className="whitespace-nowrap">{l.floor}</span>,
    sortField: 'floor',
  },
  {
    align: 'right',
    firstOrder: 'desc',
    key: 'deposit',
    label: '보증금 / 임대료',
    render: (l) => `${l.deposit.toLocaleString('ko-KR')} / ${formatManwon(l.rent)}`,
    sortField: 'deposit',
  },
  {
    align: 'right',
    firstOrder: 'desc',
    key: 'premium',
    label: '권리금',
    render: (l) => formatManwon(l.premium),
    sortField: 'premium',
  },
  {
    key: 'status',
    label: '상태',
    render: (l) => <KkiruStatusBadge label={LISTING_STATUS_LABELS[l.status]} status={l.status} />,
    sortField: 'status',
  },
];

const STATUS_OPTIONS = LISTING_STATUSES.map((value) => ({
  label: LISTING_STATUS_LABELS[value],
  value,
}));

export function KkiruListingTable() {
  return (
    <ListTable
      addLink={{ href: '/kkiru/listings/new', label: '새 매물' }}
      columns={COLUMNS}
      defaultSort={{ field: 'createdAt', order: 'desc' }}
      emptyText="아직 등록된 매물이 없습니다."
      load={listKkiruListings}
      minWidth="70rem"
      rowLink={(l) => ({
        extra: <CopyCodeButton code={l.code} label="매물 번호" />,
        href: `/kkiru/listings/${l.code}`,
        label: `매물 ${l.name} 상세 보기`,
        text: l.code,
      })}
      searchFields={[
        { label: '매물 번호', value: 'code' },
        { label: '매물 이름', value: 'name' },
        { label: '주소', value: 'address' },
        { label: '의뢰인', value: 'client' },
      ]}
      statusOptions={STATUS_OPTIONS}
      title="매물"
      unit="건"
    />
  );
}
