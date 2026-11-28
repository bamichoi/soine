'use client';

import { useSearchParams } from 'next/navigation';
import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruMeetingForm } from '@/components/kkiru-meeting-form';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { type ListColumn, ListTable } from '@/components/list-table';
import { formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  getConsultation,
  getMeeting,
  listMeetings,
  type MeetingSummary,
} from '@/lib/kkiru-cases-api';
import { type KkiruMeetingStatus, MEETING_STATUS_LABELS } from '@/lib/kkiru-status';

const COLUMNS: ListColumn<MeetingSummary>[] = [
  { key: 'case', label: '케이스 번호', render: () => null },
  {
    firstOrder: 'desc',
    key: 'meetAt',
    sortField: 'meetAt',
    label: '미팅 일시',
    render: (m) => (
      <span className="whitespace-nowrap tabular-nums">{formatSeoulDateTime(m.meetAt)}</span>
    ),
  },
  {
    key: 'customer',
    sortField: 'customer',
    label: '고객',
    render: (m) => <span className="whitespace-nowrap">{m.customer.name}</span>,
  },
  {
    key: 'listing',
    sortField: 'listing',
    label: '대상 매물',
    render: (m) => (
      <p className="max-w-[22rem] truncate" title={m.listing.name}>
        {m.listing.name}
      </p>
    ),
  },
  {
    key: 'title',
    sortField: 'consultationTitle',
    label: '상담',
    render: (m) => (
      <p className="max-w-[22rem] truncate" title={m.consultationTitle}>
        {m.consultationTitle}
      </p>
    ),
  },
  {
    key: 'status',
    sortField: 'status',
    label: '상태',
    render: (m) => <KkiruStatusBadge label={MEETING_STATUS_LABELS[m.status]} status={m.status} />,
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
      columns={COLUMNS}
      emptyText="아직 미팅이 없습니다. 상담 상세에서 미팅 진행을 눌러 만들어 주세요."
      load={listMeetings}
      minWidth="64rem"
      rowLink={(m) => ({
        extra: <CopyCodeButton code={m.caseCode} label="케이스 번호" />,
        href: `/kkiru/meetings/${m.id}`,
        label: `미팅 ${m.listing.name} 상세 보기`,
        text: m.caseCode,
      })}
      defaultSort={{ field: 'meetAt', order: 'desc' }}
      searchFields={[
        { label: '케이스 번호', value: 'caseCode' },
        { label: '고객', value: 'customer' },
        { label: '대상 매물', value: 'listing' },
        { label: '상담 제목', value: 'consultationTitle' },
      ]}
      statusOptions={STATUS_OPTIONS}
      title="미팅"
      unit="건"
    />
  );
}

export function KkiruNewMeeting() {
  const consultationCode = (useSearchParams().get('consultation') ?? '').toUpperCase();

  if (!/^[0-9A-Z]{1,16}$/.test(consultationCode)) {
    return (
      <p className="py-10 text-sm text-[var(--muted)]">
        미팅은 상담 상세의 미팅 진행에서 만들 수 있습니다.
      </p>
    );
  }

  return (
    <KkiruLoader load={getConsultation} loadKey={consultationCode} noun="상담">
      {(consultation) => <KkiruMeetingForm consultation={consultation} mode="create" />}
    </KkiruLoader>
  );
}

export function KkiruMeetingEdit({ id }: { id: string }) {
  return (
    <KkiruLoader load={getMeeting} loadKey={id} noun="미팅">
      {(meeting) => <KkiruMeetingForm meeting={meeting} mode="edit" />}
    </KkiruLoader>
  );
}
