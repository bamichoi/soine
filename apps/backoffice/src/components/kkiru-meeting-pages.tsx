'use client';

import { useSearchParams } from 'next/navigation';
import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruMeetingForm } from '@/components/kkiru-meeting-form';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { type ListColumn, ListTable } from '@/components/list-table';
import { formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import { getMeeting, listMeetings, type MeetingSummary } from '@/lib/kkiru-cases-api';
import { formatManwon } from '@/lib/kkiru-format';
import { type KkiruMeetingStatus, MEETING_STATUS_LABELS } from '@/lib/kkiru-status';
import { formatPhone } from '@/lib/phone';

const COLUMNS: ListColumn<MeetingSummary>[] = [
  { key: 'code', label: '케이스 번호', render: () => null },
  {
    firstOrder: 'desc',
    key: 'meetAt',
    sortField: 'meetAt',
    label: '미팅 일시',
    render: (c) => (
      <span className="whitespace-nowrap tabular-nums">{formatSeoulDateTime(c.meetAt)}</span>
    ),
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
    render: (c) => <KkiruStatusBadge label={MEETING_STATUS_LABELS[c.status]} status={c.status} />,
  },
];

const STATUS_OPTIONS = (Object.keys(MEETING_STATUS_LABELS) as KkiruMeetingStatus[]).map(
  (value) => ({
    label: MEETING_STATUS_LABELS[value],
    value,
  }),
);

export function KkiruMeetingTable() {
  return (
    <ListTable
      addLink={{ href: '/kkiru/meetings/new', label: '새 미팅' }}
      columns={COLUMNS}
      emptyText="아직 미팅이 없습니다."
      load={listMeetings}
      minWidth="68rem"
      rowLink={(c) => ({
        extra: <CopyCodeButton code={c.code} label="케이스 번호" />,
        href: `/kkiru/meetings/${c.code}`,
        label: `미팅 ${c.title} 상세 보기`,
        text: c.code,
      })}
      defaultSort={{ field: 'meetAt', order: 'desc' }}
      searchFields={[
        { label: '케이스 번호', value: 'code' },
        { label: '제목', value: 'title' },
        { label: '고객', value: 'customer' },
        { label: '연락처', value: 'phone' },
        { label: '관심 상권', value: 'interestArea' },
        { label: '희망 업종', value: 'desiredBusiness' },
      ]}
      statusOptions={STATUS_OPTIONS}
      title="미팅"
      unit="건"
    />
  );
}

export function KkiruNewMeeting() {
  const searchParams = useSearchParams();
  return <KkiruMeetingForm initialCustomerCode={searchParams.get('customer')} />;
}

export function KkiruMeetingEdit({ code }: { code: string }) {
  return (
    <KkiruLoader load={getMeeting} loadKey={code} noun="미팅">
      {(meeting) => <KkiruMeetingForm meeting={meeting} />}
    </KkiruLoader>
  );
}
