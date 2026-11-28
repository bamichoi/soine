'use client';

import { CopyCodeButton } from '@/components/copy-code-button';
import { type ListColumn, ListTable } from '@/components/list-table';
import { ReservationStatusBadge } from '@/components/reservation-status-badge';
import { formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  listReservations,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUSES,
  type Reservation,
} from '@/lib/choidolsang-reservations-api';
import { formatWon } from '@/lib/money';

const COLUMNS: ListColumn<Reservation>[] = [
  { key: 'code', label: '예약 번호', render: () => null },
  {
    firstOrder: 'desc',
    key: 'eventAt',
    label: '행사 일시',
    render: (r) => (
      <span className="whitespace-nowrap tabular-nums">{formatSeoulDateTime(r.eventAt)}</span>
    ),
    sortField: 'eventAt',
  },
  {
    key: 'customerName',
    label: '예약자',
    render: (r) => <span className="whitespace-nowrap">{r.customerName}</span>,
    sortField: 'customerName',
  },
  {
    key: 'babyName',
    label: '아기 이름',
    render: (r) => <span className="whitespace-nowrap">{r.babyName}</span>,
    sortField: 'babyName',
  },
  {
    key: 'concept',
    label: '돌상 컨셉',
    render: (r) => (
      <p className="max-w-[22rem] truncate" title={r.concept.name}>
        {r.concept.name}
      </p>
    ),
    sortField: 'concept',
  },
  {
    align: 'right',
    firstOrder: 'desc',
    key: 'totalAmount',
    label: '최종 결제 금액',
    render: (r) => formatWon(r.totalAmount),
    sortField: 'totalAmount',
  },
  {
    key: 'status',
    label: '상태',
    render: (r) => <ReservationStatusBadge status={r.status} />,
    sortField: 'status',
  },
];

const STATUS_OPTIONS = RESERVATION_STATUSES.map((value) => ({
  label: RESERVATION_STATUS_LABELS[value],
  value,
}));

// 예약 목록. 예약은 문의에서 만들므로 여기에는 추가 버튼이 없다.
export function ChoidolsangReservationTable() {
  return (
    <ListTable
      columns={COLUMNS}
      defaultSort={{ field: 'eventAt', order: 'desc' }}
      emptyText="아직 예약이 없습니다. 문의 상세에서 예약 진행을 눌러 예약을 만들어 주세요."
      load={listReservations}
      minWidth="56rem"
      rowLink={(r, listQuery) => ({
        extra: <CopyCodeButton code={r.code} label="예약 번호" />,
        href: `/choidolsang/reservations/${r.code}${listQuery}`,
        label: `예약 ${r.code} 상세 보기`,
        text: r.code,
      })}
      searchFields={[
        { label: '예약 번호', value: 'code' },
        { label: '예약자', value: 'customerName' },
        { label: '예약자 연락처', value: 'customerPhone' },
        { label: '아기 이름', value: 'babyName' },
        { label: '돌상 컨셉', value: 'concept' },
        { label: '행사 장소', value: 'eventLocation' },
      ]}
      statusOptions={STATUS_OPTIONS}
      title="예약"
      unit="건"
    />
  );
}
