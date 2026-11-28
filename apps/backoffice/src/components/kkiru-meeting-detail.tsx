'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CodeHeader, InfoItem, SectionTitle } from '@/components/kkiru-detail-parts';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruLogPanel } from '@/components/kkiru-log-panel';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { PhoneNumber } from '@/components/phone-number';
import { ReasonDialog } from '@/components/reason-dialog';
import { formatInquiryDate, formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  addMeetingRecord,
  getMeeting,
  MEETING_RECORD_KIND_LABELS,
  type MeetingDetail,
  resumeMeeting,
  stopMeeting,
  updateMeetingRecord,
} from '@/lib/kkiru-cases-api';
import { formatArea, formatManwon } from '@/lib/kkiru-format';
import { CONTRACT_STATUS_LABELS, MEETING_STATUS_LABELS } from '@/lib/kkiru-status';
import { PRIMARY_BUTTON_CLASS_NAME, SECONDARY_BUTTON_CLASS_NAME } from '@/lib/kkiru-ui';

function StatusButtons({
  meeting,
  onChange,
}: {
  meeting: MeetingDetail;
  onChange: (next: MeetingDetail) => void;
}) {
  const [dialog, setDialog] = useState<'stop' | 'resume' | null>(null);
  const activeContract = meeting.contracts.find((contract) => contract.status !== 'cancelled');

  return (
    <div className="flex flex-wrap gap-2">
      {meeting.status === 'meeting' ? (
        <button
          className={`${SECONDARY_BUTTON_CLASS_NAME} text-[var(--error)]`}
          onClick={() => setDialog('stop')}
          type="button"
        >
          미팅 중단
        </button>
      ) : null}
      {meeting.status === 'stopped' ? (
        <button
          className={SECONDARY_BUTTON_CLASS_NAME}
          onClick={() => setDialog('resume')}
          type="button"
        >
          미팅 재개
        </button>
      ) : null}
      {meeting.canStartContract ? (
        <Link
          className={PRIMARY_BUTTON_CLASS_NAME}
          href={`/kkiru/contracts/new?meeting=${meeting.id}`}
        >
          계약 진행
        </Link>
      ) : null}
      {activeContract ? (
        <Link className={PRIMARY_BUTTON_CLASS_NAME} href={`/kkiru/contracts/${activeContract.id}`}>
          계약 정보
        </Link>
      ) : null}

      <ReasonDialog
        confirmLabel="미팅 중단"
        isOpen={dialog === 'stop'}
        label="중단 사유"
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          onChange(await stopMeeting(meeting.id, reason));
          setDialog(null);
        }}
        title="미팅 중단"
        tone="danger"
      />
      <ReasonDialog
        confirmLabel="미팅 재개"
        isOpen={dialog === 'resume'}
        label="재개 사유"
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          onChange(await resumeMeeting(meeting.id, reason));
          setDialog(null);
        }}
        title="미팅 재개"
      />
    </div>
  );
}

function MeetingBody({
  meeting,
  onChange,
}: {
  meeting: MeetingDetail;
  onChange: (next: MeetingDetail) => void;
}) {
  const { listing } = meeting;

  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-6 p-6">
        <CodeHeader
          code={meeting.caseCode}
          label="케이스 번호"
          status={meeting.status}
          statusLabel={MEETING_STATUS_LABELS[meeting.status]}
        >
          <Link
            className="flex h-7 items-center border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium hover:bg-[var(--background)]"
            href={`/kkiru/consultations/${meeting.caseCode}`}
          >
            상담 기록
          </Link>
        </CodeHeader>

        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <InfoItem label="고객">
            <Link
              className="text-[var(--brand)] underline-offset-2 hover:underline"
              href={`/kkiru/customers/${meeting.customer.code}`}
            >
              {meeting.customer.name}
            </Link>{' '}
            <PhoneNumber className="text-[var(--muted)]" phone={meeting.customer.phone} />
          </InfoItem>
          <InfoItem label="미팅 일시">{formatSeoulDateTime(meeting.meetAt)}</InfoItem>
        </dl>

        <section aria-label="대상 매물" className="flex flex-col gap-2">
          <SectionTitle>대상 매물</SectionTitle>
          <Link
            className="flex flex-col gap-1 border border-[var(--line)] px-4 py-3 text-sm hover:bg-[var(--background)]"
            href={`/kkiru/listings/${listing.code}`}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-[13px]">{listing.code}</span>
              <span className="font-medium">{listing.name}</span>
            </span>
            <span className="text-xs text-[var(--muted)]">
              {listing.address} · {formatArea(listing.areaM2)} · {listing.floor} · 보증금{' '}
              {formatManwon(listing.deposit)} / 월 {formatManwon(listing.rent)} · 권리금{' '}
              {formatManwon(listing.premium)}
            </span>
          </Link>
        </section>

        <KkiruLogPanel
          entries={meeting.records.map((record) => ({
            ...record,
            label: MEETING_RECORD_KIND_LABELS[record.kind],
          }))}
          onAdd={async (input) => onChange(await addMeetingRecord(meeting.id, input))}
          onUpdate={async (recordId, input) =>
            onChange(await updateMeetingRecord(meeting.id, recordId, input))
          }
          title="미팅 내용"
        />

        {meeting.contracts.length > 0 ? (
          <section aria-label="계약" className="flex flex-col gap-2">
            <SectionTitle>계약 {meeting.contracts.length}건</SectionTitle>
            <ul className="flex flex-col border border-[var(--line)]">
              {meeting.contracts.map((contract) => (
                <li className="border-b border-[var(--line)] last:border-b-0" key={contract.id}>
                  <Link
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--background)]"
                    href={`/kkiru/contracts/${contract.id}`}
                  >
                    <span className="tabular-nums">
                      계약일 {formatInquiryDate(contract.contractedOn)}
                    </span>
                    <KkiruStatusBadge
                      label={CONTRACT_STATUS_LABELS[contract.status]}
                      status={contract.status}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
        <Link className={SECONDARY_BUTTON_CLASS_NAME} href={`/kkiru/meetings/${meeting.id}/edit`}>
          수정
        </Link>
        <StatusButtons meeting={meeting} onChange={onChange} />
      </footer>
    </article>
  );
}

export function KkiruMeetingDetailView({ id }: { id: string }) {
  return (
    <KkiruLoader load={getMeeting} loadKey={id} noun="미팅">
      {(meeting, replace) => <MeetingBody meeting={meeting} onChange={replace} />}
    </KkiruLoader>
  );
}
