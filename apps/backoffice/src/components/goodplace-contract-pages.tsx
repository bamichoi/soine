'use client';

import { useSearchParams } from 'next/navigation';
import { CopyCodeButton } from '@/components/copy-code-button';
import { DataLoader } from '@/components/data-loader';
import { GoodplaceContractForm } from '@/components/goodplace-contract-form';
import { GoodplaceStatusBadge } from '@/components/goodplace-status-badge';
import { type ListColumn, ListTable } from '@/components/list-table';
import { Notice } from '@/components/page-parts';
import { formatInquiryDate } from '@/lib/choidolsang-inquiries-api';
import {
  type ContractSummary,
  getContract,
  getMeeting,
  listContracts,
} from '@/lib/goodplace-cases-api';
import { formatManwon } from '@/lib/goodplace-format';
import { parseRouteCode } from '@/lib/goodplace-route';
import { CONTRACT_STATUS_LABELS, CONTRACT_STATUSES } from '@/lib/goodplace-status';

const COLUMNS: ListColumn<ContractSummary>[] = [
  { key: 'case', label: '케이스 번호', render: () => null },
  {
    firstOrder: 'desc',
    key: 'contractedOn',
    sortField: 'contractedOn',
    label: '계약일',
    render: (c) => <span className="tabular-nums">{formatInquiryDate(c.contractedOn)}</span>,
  },
  {
    key: 'customer',
    sortField: 'customer',
    label: '임차인',
    render: (c) => <span className="font-semibold whitespace-nowrap">{c.customer.name}</span>,
  },
  {
    key: 'listing',
    sortField: 'listing',
    label: '대상 매물',
    render: (c) => (
      <p className="max-w-[22rem] truncate text-[var(--muted)]" title={c.listing.name}>
        {c.listing.name}
      </p>
    ),
  },
  {
    align: 'right',
    firstOrder: 'desc',
    key: 'commission',
    sortField: 'commission',
    label: '수수료',
    render: (c) => <span className="font-bold">{formatManwon(c.commission)}</span>,
  },
  {
    align: 'right',
    firstOrder: 'desc',
    key: 'balance',
    sortField: 'balance',
    label: '잔금',
    render: (c) => formatManwon(c.balance),
  },
  {
    firstOrder: 'asc',
    key: 'balanceDueOn',
    sortField: 'balanceDueOn',
    label: '잔금일',
    render: (c) => <span className="tabular-nums">{formatInquiryDate(c.balanceDueOn)}</span>,
  },
  {
    key: 'status',
    sortField: 'status',
    label: '상태',
    render: (c) => (
      <GoodplaceStatusBadge label={CONTRACT_STATUS_LABELS[c.status]} status={c.status} />
    ),
  },
];

const STATUS_OPTIONS = CONTRACT_STATUSES.map((value) => ({
  label: CONTRACT_STATUS_LABELS[value],
  value,
}));

export function GoodplaceContractTable() {
  return (
    <ListTable
      columns={COLUMNS}
      emptyText="아직 계약이 없습니다. 미팅 상세에서 계약 진행을 눌러 만들어 주세요."
      load={listContracts}
      minWidth="68rem"
      rowLink={(c) => ({
        extra: <CopyCodeButton code={c.caseCode} label="케이스 번호" />,
        href: `/goodplace/contracts/${c.id}`,
        label: `계약 ${c.listing.name} 상세 보기`,
        text: c.caseCode,
      })}
      defaultSort={{ field: 'contractedOn', order: 'desc' }}
      searchFields={[
        { label: '케이스 번호', value: 'caseCode' },
        { label: '임차인', value: 'customer' },
        { label: '대상 매물', value: 'listing' },
        { label: '임대인', value: 'landlord' },
      ]}
      statusOptions={STATUS_OPTIONS}
      title="계약"
      unit="건"
    />
  );
}

export function GoodplaceNewContract() {
  const searchParams = useSearchParams();
  const meetingCode = parseRouteCode(searchParams.get('meeting') ?? '');
  const listingCode = parseRouteCode(searchParams.get('listing') ?? '');

  if (!meetingCode) {
    return <Notice text="계약은 미팅 상세의 계약 진행에서 만들 수 있습니다." />;
  }

  return (
    <DataLoader load={getMeeting} loadKey={meetingCode} noun="미팅">
      {(meeting) =>
        meeting.canStartContract ? (
          <GoodplaceContractForm initialListingCode={listingCode} meeting={meeting} mode="create" />
        ) : (
          <Notice text="이 미팅은 지금 계약을 만들 수 없는 상태입니다." />
        )
      }
    </DataLoader>
  );
}

export function GoodplaceContractEdit({ id }: { id: string }) {
  return (
    <DataLoader load={getContract} loadKey={id} noun="계약">
      {(contract) =>
        contract.status === 'contracting' ? (
          <GoodplaceContractForm contract={contract} mode="edit" />
        ) : (
          <Notice text="계약예정인 계약만 고칠 수 있습니다." />
        )
      }
    </DataLoader>
  );
}
