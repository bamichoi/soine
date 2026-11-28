'use client';

import { useSearchParams } from 'next/navigation';
import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruContractForm } from '@/components/kkiru-contract-form';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { type ListColumn, ListTable } from '@/components/list-table';
import { formatInquiryDate } from '@/lib/choidolsang-inquiries-api';
import {
  type ContractSummary,
  getContract,
  getMeeting,
  listContracts,
} from '@/lib/kkiru-cases-api';
import { formatManwon } from '@/lib/kkiru-format';
import { parseRouteId } from '@/lib/kkiru-route';
import { CONTRACT_STATUS_LABELS, type KkiruContractStatus } from '@/lib/kkiru-status';

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
    render: (c) => <span className="whitespace-nowrap">{c.customer.name}</span>,
  },
  {
    key: 'listing',
    sortField: 'listing',
    label: '대상 매물',
    render: (c) => (
      <p className="max-w-[22rem] truncate" title={c.listing.name}>
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
    render: (c) => formatManwon(c.commission),
  },
  {
    key: 'status',
    sortField: 'status',
    label: '상태',
    render: (c) => <KkiruStatusBadge label={CONTRACT_STATUS_LABELS[c.status]} status={c.status} />,
  },
];

const STATUS_OPTIONS = (Object.keys(CONTRACT_STATUS_LABELS) as KkiruContractStatus[]).map(
  (value) => ({
    label: CONTRACT_STATUS_LABELS[value],
    value,
  }),
);

export function KkiruContractTable() {
  return (
    <ListTable
      columns={COLUMNS}
      emptyText="아직 계약이 없습니다. 미팅 상세에서 계약 진행을 눌러 만들어 주세요."
      load={listContracts}
      minWidth="56rem"
      rowLink={(c) => ({
        extra: <CopyCodeButton code={c.caseCode} label="케이스 번호" />,
        href: `/kkiru/contracts/${c.id}`,
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

export function KkiruNewContract() {
  const meetingId = parseRouteId(useSearchParams().get('meeting') ?? '');

  if (!meetingId) {
    return (
      <p className="py-10 text-sm text-[var(--muted)]">
        계약은 미팅 상세의 계약 진행에서 만들 수 있습니다.
      </p>
    );
  }

  return (
    <KkiruLoader load={getMeeting} loadKey={meetingId} noun="미팅">
      {(meeting) =>
        meeting.canStartContract ? (
          <KkiruContractForm meeting={meeting} mode="create" />
        ) : (
          <p className="py-10 text-sm text-[var(--muted)]">
            이 미팅은 지금 계약을 만들 수 없는 상태입니다.
          </p>
        )
      }
    </KkiruLoader>
  );
}

export function KkiruContractEdit({ id }: { id: string }) {
  return (
    <KkiruLoader load={getContract} loadKey={id} noun="계약">
      {(contract) =>
        contract.status === 'contracting' ? (
          <KkiruContractForm contract={contract} mode="edit" />
        ) : (
          <p className="py-10 text-sm text-[var(--muted)]">계약예정인 계약만 고칠 수 있습니다.</p>
        )
      }
    </KkiruLoader>
  );
}
