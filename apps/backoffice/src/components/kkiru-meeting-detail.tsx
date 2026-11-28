'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import { CodeHeader, InfoItem, SectionTitle } from '@/components/kkiru-detail-parts';
import { KkiruListingPicker } from '@/components/kkiru-listing-picker';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruLogPanel } from '@/components/kkiru-log-panel';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { PhoneNumber } from '@/components/phone-number';
import { ReasonDialog } from '@/components/reason-dialog';
import { AdminApiError } from '@/lib/admin-auth-api';
import { formatInquiryDate, formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  addMeetingListing,
  addMeetingRecord,
  getMeeting,
  INFLOW_SOURCE_LABELS,
  MEETING_RECORD_KIND_LABELS,
  type MeetingDetail,
  type MeetingListing,
  removeMeetingListing,
  resumeMeeting,
  stopMeeting,
  updateMeetingRecord,
} from '@/lib/kkiru-cases-api';
import { formatArea, formatDecimal, formatManwon, pyeongToSquareMeters } from '@/lib/kkiru-format';
import {
  CONTRACT_STATUS_LABELS,
  type KkiruListingStatus,
  LISTING_STATUS_LABELS,
  MEETING_STATUS_LABELS,
} from '@/lib/kkiru-status';
import { PRIMARY_BUTTON_CLASS_NAME, SECONDARY_BUTTON_CLASS_NAME } from '@/lib/kkiru-ui';

const CARD_LINK_CLASS_NAME =
  'flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--background)]';

/** 다른 고객이 계약 중이거나 계약완료된 매물로는 계약을 시작하지 않는다. */
const CONTRACTABLE_LISTING_STATUSES: KkiruListingStatus[] = ['available', 'meeting'];

function newContractHref(meetingCode: string, listingCode?: string): string {
  const params = new URLSearchParams({ meeting: meetingCode });

  if (listingCode) {
    params.set('listing', listingCode);
  }

  return `/kkiru/contracts/new?${params}`;
}

/** 카드 오른쪽의 세로 점(⋮) 메뉴. 지금은 '제거'만 있다. */
function CardMenu({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 밖을 누르거나 Esc를 누르면 닫는다.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${label} 메뉴`}
        className="flex size-8 cursor-pointer items-center justify-center text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Icon className="size-4" name="more-vertical" />
      </button>
      {isOpen ? (
        <div
          className="absolute top-full right-0 z-10 mt-1 w-28 border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg"
          role="menu"
        >
          <button
            className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[var(--error)] hover:bg-[var(--background)]"
            onClick={() => {
              setIsOpen(false);
              onRemove();
            }}
            role="menuitem"
            type="button"
          >
            제거
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MeetingListingRow({
  meeting,
  listing,
  onChange,
}: {
  meeting: MeetingDetail;
  listing: MeetingListing;
  onChange: (next: MeetingDetail) => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const canContract =
    meeting.canStartContract && CONTRACTABLE_LISTING_STATUSES.includes(listing.status);
  // 계약이 걸린 매물은 미팅에서 뺄 수 없다.
  const canRemove = listing.contractStatus === null;

  return (
    <li className="flex items-center border-b border-[var(--line)] last:border-b-0">
      <Link className={CARD_LINK_CLASS_NAME} href={`/kkiru/listings/${listing.code}`}>
        <span className="w-24 shrink-0 font-mono text-[13px]">{listing.code}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{listing.name}</span>
          <span className="truncate text-xs text-[var(--muted)]">
            {formatArea(listing.areaM2)} · {listing.floor} · 보증금 {formatManwon(listing.deposit)}{' '}
            / 월 {formatManwon(listing.rent)} · 권리금 {formatManwon(listing.premium)}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <KkiruStatusBadge label={LISTING_STATUS_LABELS[listing.status]} status={listing.status} />
          {listing.contractStatus ? (
            <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
              이 미팅 계약
              <KkiruStatusBadge
                label={CONTRACT_STATUS_LABELS[listing.contractStatus]}
                status={listing.contractStatus}
              />
            </span>
          ) : null}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1 pr-2">
        {canContract ? (
          <Link
            className="flex h-8 items-center border border-[var(--brand)] px-2.5 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
            href={newContractHref(meeting.code, listing.code)}
          >
            계약 진행
          </Link>
        ) : null}
        {canRemove ? (
          <CardMenu label={`미팅 매물 ${listing.name}`} onRemove={() => setIsConfirming(true)} />
        ) : (
          <span aria-hidden className="size-8" />
        )}
      </div>
      <ConfirmDialog
        confirmLabel="제거"
        getErrorMessage={(error) =>
          error instanceof AdminApiError && error.status === 409
            ? '계약이 걸린 매물은 제거할 수 없습니다.'
            : '미팅 매물에서 제거하지 못했습니다. 잠시 후 다시 시도해 주세요.'
        }
        isOpen={isConfirming}
        message={
          <>
            <strong>{listing.name}</strong>을(를) 이 미팅의 매물 목록에서 제거합니다. 매물 자체는
            지워지지 않습니다.
          </>
        }
        onClose={() => setIsConfirming(false)}
        onConfirm={async () => {
          onChange(await removeMeetingListing(meeting.code, listing.id));
          setIsConfirming(false);
        }}
        pendingLabel="제거하는 중..."
        title="미팅 매물 제거"
        tone="danger"
      />
    </li>
  );
}

function MeetingListings({
  meeting,
  onChange,
}: {
  meeting: MeetingDetail;
  onChange: (next: MeetingDetail) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <section aria-label="미팅 매물" className="flex flex-col gap-3">
      <SectionTitle
        action={
          isAdding ? null : (
            <button
              className="inline-flex h-8 cursor-pointer items-center gap-1 border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium hover:bg-[var(--background)]"
              onClick={() => setIsAdding(true)}
              type="button"
            >
              <Icon className="size-3.5" name="plus" />
              매물 추가
            </button>
          )
        }
      >
        미팅 매물 {meeting.listings.length}건
      </SectionTitle>
      {isAdding ? (
        <div className="flex flex-col gap-2 border border-[var(--line)] p-3">
          <KkiruListingPicker
            excludeIds={meeting.listings.map((listing) => listing.id)}
            onPick={async (listing) => {
              setErrorMessage('');

              try {
                onChange(await addMeetingListing(meeting.code, listing.id));
                setIsAdding(false);
              } catch {
                setErrorMessage('매물을 더하지 못했습니다. 이미 계약완료된 매물일 수 있습니다.');
              }
            }}
          />
          {errorMessage ? (
            <p className="text-xs text-[var(--error)]" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            className="cursor-pointer self-end text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => setIsAdding(false)}
            type="button"
          >
            닫기
          </button>
        </div>
      ) : null}
      {meeting.listings.length > 0 ? (
        <ul className="flex flex-col border border-[var(--line)]">
          {meeting.listings.map((listing) => (
            <MeetingListingRow
              key={listing.id}
              listing={listing}
              meeting={meeting}
              onChange={onChange}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">아직 권한 매물이 없습니다.</p>
      )}
    </section>
  );
}

function MeetingContracts({ meeting }: { meeting: MeetingDetail }) {
  return (
    <section aria-label="계약" className="flex flex-col gap-3">
      <SectionTitle>계약 {meeting.contracts.length}건</SectionTitle>
      {meeting.contracts.length > 0 ? (
        <ul className="flex flex-col border border-[var(--line)]">
          {meeting.contracts.map((contract) => (
            <li className="border-b border-[var(--line)] last:border-b-0" key={contract.id}>
              <Link className={CARD_LINK_CLASS_NAME} href={`/kkiru/contracts/${contract.id}`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{contract.listing.name}</span>
                  <span className="text-xs text-[var(--muted)] tabular-nums">
                    계약일 {formatInquiryDate(contract.contractedOn)}
                  </span>
                </span>
                <KkiruStatusBadge
                  label={CONTRACT_STATUS_LABELS[contract.status]}
                  status={contract.status}
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">아직 계약이 없습니다.</p>
      )}
    </section>
  );
}

function MeetingActions({
  meeting,
  onChange,
}: {
  meeting: MeetingDetail;
  onChange: (next: MeetingDetail) => void;
}) {
  const [dialog, setDialog] = useState<'stop' | 'resume' | null>(null);
  const activeContract = meeting.contracts.find((contract) => contract.status !== 'cancelled');
  const canStop = meeting.status === 'meeting' || meeting.status === 'contract_cancelled';

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
      <div className="flex flex-wrap gap-2">
        <Link className={SECONDARY_BUTTON_CLASS_NAME} href={`/kkiru/meetings/${meeting.code}/edit`}>
          수정
        </Link>
        {canStop ? (
          <button
            className={`${SECONDARY_BUTTON_CLASS_NAME} cursor-pointer text-[var(--error)]`}
            onClick={() => setDialog('stop')}
            type="button"
          >
            미팅 중단
          </button>
        ) : null}
        {meeting.status === 'stopped' ? (
          <button
            className={`${SECONDARY_BUTTON_CLASS_NAME} cursor-pointer`}
            onClick={() => setDialog('resume')}
            type="button"
          >
            미팅 재개
          </button>
        ) : null}
      </div>
      {meeting.canStartContract ? (
        <Link className={PRIMARY_BUTTON_CLASS_NAME} href={newContractHref(meeting.code)}>
          계약 진행
        </Link>
      ) : activeContract ? (
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
          onChange(await stopMeeting(meeting.code, reason));
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
          onChange(await resumeMeeting(meeting.code, reason));
          setDialog(null);
        }}
        title="미팅 재개"
      />
    </footer>
  );
}

function MeetingBody({
  meeting,
  onChange,
}: {
  meeting: MeetingDetail;
  onChange: (next: MeetingDetail) => void;
}) {
  const { customer } = meeting;
  const inflow =
    meeting.inflowSource === 'other'
      ? `기타 · ${meeting.inflowSourceDetail ?? ''}`
      : INFLOW_SOURCE_LABELS[meeting.inflowSource];

  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-6 p-6">
        <CodeHeader
          code={meeting.code}
          label="케이스 번호"
          status={meeting.status}
          statusLabel={MEETING_STATUS_LABELS[meeting.status]}
        />
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold break-words">{meeting.title}</h3>
          <p className="text-sm">
            <Link
              className="text-[var(--brand)] underline-offset-2 hover:underline"
              href={`/kkiru/customers/${customer.code}`}
            >
              {customer.name}
            </Link>{' '}
            <PhoneNumber className="text-[var(--muted)]" phone={customer.phone} />
          </p>
        </div>

        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <InfoItem label="미팅 일시">{formatSeoulDateTime(meeting.meetAt)}</InfoItem>
          <InfoItem label="관심 상권">{meeting.interestArea}</InfoItem>
          <InfoItem label="희망 업종">{meeting.desiredBusiness}</InfoItem>
          <InfoItem label="희망 층수">{meeting.desiredFloor}</InfoItem>
          <InfoItem label="희망 평수">
            {formatDecimal(meeting.desiredPyeongMin)}~{formatDecimal(meeting.desiredPyeongMax)}평{' '}
            <span className="text-[var(--muted)]">
              (약 {formatDecimal(pyeongToSquareMeters(meeting.desiredPyeongMin))}~
              {formatDecimal(pyeongToSquareMeters(meeting.desiredPyeongMax))}㎡)
            </span>
          </InfoItem>
          <InfoItem label="희망 임대료">{formatManwon(meeting.desiredRent)}</InfoItem>
          <InfoItem label="최대 가용 보증금">{formatManwon(meeting.maxDeposit)}</InfoItem>
          <InfoItem label="최대 가용 권리금">{formatManwon(meeting.maxPremium)}</InfoItem>
          <InfoItem label="예산">
            <span className="font-semibold">{formatManwon(meeting.budget)}</span>
          </InfoItem>
          <InfoItem label="유입 경로">{inflow}</InfoItem>
        </dl>

        <KkiruLogPanel
          entries={meeting.records.map((record) => ({
            ...record,
            label: MEETING_RECORD_KIND_LABELS[record.kind],
          }))}
          onAdd={async (input) => onChange(await addMeetingRecord(meeting.code, input))}
          onUpdate={async (recordId, input) =>
            onChange(await updateMeetingRecord(meeting.code, recordId, input))
          }
          title="미팅 내용"
        />

        <MeetingListings meeting={meeting} onChange={onChange} />
        <MeetingContracts meeting={meeting} />
      </div>

      <MeetingActions meeting={meeting} onChange={onChange} />
    </article>
  );
}

export function KkiruMeetingDetailView({ code }: { code: string }) {
  return (
    <KkiruLoader load={getMeeting} loadKey={code} noun="미팅">
      {(meeting, replace) => <MeetingBody meeting={meeting} onChange={replace} />}
    </KkiruLoader>
  );
}
