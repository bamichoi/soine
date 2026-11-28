'use client';

import { CopyCodeButton } from '@/components/copy-code-button';
import { GoodplaceStatusBadge } from '@/components/goodplace-status-badge';
import { type ListColumn, ListTable } from '@/components/list-table';
import { formatArea, formatManwon } from '@/lib/goodplace-format';
import { type GoodplaceListing, listGoodplaceListings } from '@/lib/goodplace-listings-api';
import { LISTING_STATUS_LABELS, LISTING_STATUSES } from '@/lib/goodplace-status';

const COLUMNS: ListColumn<GoodplaceListing>[] = [
  { key: 'code', label: '매물 번호', render: () => null },
  {
    key: 'name',
    label: '매물 이름',
    render: (l) => (
      <p className="max-w-[22rem] truncate font-semibold" title={l.name}>
        {l.name}
      </p>
    ),
    sortField: 'name',
  },
  {
    key: 'address',
    label: '주소',
    render: (l) => (
      <p className="max-w-[22rem] truncate text-[var(--muted)]" title={l.address}>
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
    render: (l) => <span className="font-bold">{formatManwon(l.premium)}</span>,
    sortField: 'premium',
  },
  {
    key: 'status',
    label: '상태',
    render: (l) => (
      <GoodplaceStatusBadge label={LISTING_STATUS_LABELS[l.status]} status={l.status} />
    ),
    sortField: 'status',
  },
];

const STATUS_OPTIONS = LISTING_STATUSES.map((value) => ({
  label: LISTING_STATUS_LABELS[value],
  value,
}));

export function GoodplaceListingTable() {
  return (
    <ListTable
      addLink={{ href: '/goodplace/listings/new', label: '새 매물' }}
      columns={COLUMNS}
      defaultSort={{ field: 'createdAt', order: 'desc' }}
      emptyText="아직 등록된 매물이 없습니다."
      load={listGoodplaceListings}
      minWidth="70rem"
      rowLink={(l) => ({
        extra: <CopyCodeButton code={l.code} label="매물 번호" />,
        href: `/goodplace/listings/${l.code}`,
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
