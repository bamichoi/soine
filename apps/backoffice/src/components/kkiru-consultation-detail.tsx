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
import { formatInquiryDate, formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  addConsultationListing,
  addConsultationRecord,
  type ConsultationDetail,
  getConsultation,
  INFLOW_SOURCE_LABELS,
  removeConsultationListing,
  updateConsultationRecord,
} from '@/lib/kkiru-cases-api';
import { formatArea, formatDecimal, formatManwon, pyeongToSquareMeters } from '@/lib/kkiru-format';
import {
  CONSULTATION_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  LISTING_STATUS_LABELS,
  MEETING_STATUS_LABELS,
} from '@/lib/kkiru-status';
import { PRIMARY_BUTTON_CLASS_NAME, SECONDARY_BUTTON_CLASS_NAME } from '@/lib/kkiru-ui';

const CARD_LINK_CLASS_NAME =
  'flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--background)]';

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
    <div className="relative shrink-0 pr-2" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${label} 메뉴`}
        className="flex size-8 items-center justify-center text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Icon className="size-4" name="more-vertical" />
      </button>
      {isOpen ? (
        <div
          className="absolute top-full right-2 z-10 mt-1 w-28 border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg"
          role="menu"
        >
          <button
            className="w-full px-3 py-2 text-left text-sm text-[var(--error)] hover:bg-[var(--background)]"
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

function ConsultationListingRow({
  consultationCode,
  listing,
  showStatus,
  onChange,
}: {
  consultationCode: string;
  listing: ConsultationDetail['listings'][number];
  /** 이 매물로 미팅이 있으면 상태는 미팅·계약 카드에만 보여 준다. */
  showStatus: boolean;
  onChange: (next: ConsultationDetail) => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

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
        {showStatus ? (
          <KkiruStatusBadge label={LISTING_STATUS_LABELS[listing.status]} status={listing.status} />
        ) : null}
      </Link>
      <CardMenu label={`상담매물 ${listing.name}`} onRemove={() => setIsConfirming(true)} />
      <ConfirmDialog
        confirmLabel="제거"
        getErrorMessage={() => '상담매물에서 제거하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
        isOpen={isConfirming}
        message={
          <>
            <strong>{listing.name}</strong>을(를) 이 상담의 매물 목록에서 제거합니다. 매물 자체는
            지워지지 않습니다.
          </>
        }
        onClose={() => setIsConfirming(false)}
        onConfirm={async () => {
          onChange(await removeConsultationListing(consultationCode, listing.id));
          setIsConfirming(false);
        }}
        pendingLabel="제거하는 중..."
        title="상담매물 제거"
        tone="danger"
      />
    </li>
  );
}

function ConsultationListings({
  consultation,
  onChange,
}: {
  consultation: ConsultationDetail;
  onChange: (next: ConsultationDetail) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <section aria-label="상담매물" className="flex flex-col gap-3">
      <SectionTitle
        action={
          isAdding ? null : (
            <button
              className="inline-flex h-8 items-center gap-1 border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium hover:bg-[var(--background)]"
              onClick={() => setIsAdding(true)}
              type="button"
            >
              <Icon className="size-3.5" name="plus" />
              매물 추가
            </button>
          )
        }
      >
        상담매물 {consultation.listings.length}건
      </SectionTitle>
      {isAdding ? (
        <div className="flex flex-col gap-2 border border-[var(--line)] p-3">
          <KkiruListingPicker
            excludeIds={consultation.listings.map((listing) => listing.id)}
            onPick={async (listing) => {
              setErrorMessage('');

              try {
                onChange(await addConsultationListing(consultation.code, listing.id));
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
            className="self-end text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => setIsAdding(false)}
            type="button"
          >
            닫기
          </button>
        </div>
      ) : null}
      {consultation.listings.length > 0 ? (
        <ul className="flex flex-col border border-[var(--line)]">
          {consultation.listings.map((listing) => (
            <ConsultationListingRow
              consultationCode={consultation.code}
              key={listing.id}
              listing={listing}
              onChange={onChange}
              showStatus={
                !consultation.meetings.some((meeting) => meeting.listing.code === listing.code)
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">아직 권한 매물이 없습니다.</p>
      )}
    </section>
  );
}

function ConsultationMeetings({ consultation }: { consultation: ConsultationDetail }) {
  return (
    <section aria-label="미팅" className="flex flex-col gap-3">
      <SectionTitle>미팅 {consultation.meetings.length}건</SectionTitle>
      {consultation.meetings.length > 0 ? (
        <ul className="flex flex-col border border-[var(--line)]">
          {consultation.meetings.map((meeting) => (
            <li className="border-b border-[var(--line)] last:border-b-0" key={meeting.id}>
              <Link className={CARD_LINK_CLASS_NAME} href={`/kkiru/meetings/${meeting.id}`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{meeting.listing.name}</span>
                  <span className="text-xs text-[var(--muted)] tabular-nums">
                    {formatSeoulDateTime(meeting.meetAt)}
                  </span>
                </span>
                {/* 계약이 있으면 상태는 계약 카드에만 보여 준다. */}
                {meeting.contracts.length === 0 ? (
                  <KkiruStatusBadge
                    label={MEETING_STATUS_LABELS[meeting.status]}
                    status={meeting.status}
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">아직 미팅이 없습니다.</p>
      )}
    </section>
  );
}

function ConsultationContracts({ consultation }: { consultation: ConsultationDetail }) {
  const contracts = consultation.meetings
    .flatMap((meeting) =>
      meeting.contracts.map((contract) => ({ ...contract, listingName: meeting.listing.name })),
    )
    .sort((a, b) => b.contractedOn.localeCompare(a.contractedOn));

  if (contracts.length === 0) {
    return null;
  }

  return (
    <section aria-label="계약" className="flex flex-col gap-3">
      <SectionTitle>계약 {contracts.length}건</SectionTitle>
      <ul className="flex flex-col border border-[var(--line)]">
        {contracts.map((contract) => (
          <li className="border-b border-[var(--line)] last:border-b-0" key={contract.id}>
            <Link className={CARD_LINK_CLASS_NAME} href={`/kkiru/contracts/${contract.id}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{contract.listingName}</span>
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
    </section>
  );
}

function ConsultationBody({
  consultation,
  onChange,
}: {
  consultation: ConsultationDetail;
  onChange: (next: ConsultationDetail) => void;
}) {
  const { customer } = consultation;
  const inflow =
    consultation.inflowSource === 'other'
      ? `기타 · ${consultation.inflowSourceDetail ?? ''}`
      : INFLOW_SOURCE_LABELS[consultation.inflowSource];

  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-6 p-6">
        <CodeHeader
          code={consultation.code}
          label="케이스 번호"
          status={consultation.status}
          statusLabel={CONSULTATION_STATUS_LABELS[consultation.status]}
        />
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold break-words">{consultation.title}</h3>
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
          <InfoItem label="관심 상권">{consultation.interestArea}</InfoItem>
          <InfoItem label="희망 업종">{consultation.desiredBusiness}</InfoItem>
          <InfoItem label="희망 층수">{consultation.desiredFloor}</InfoItem>
          <InfoItem label="희망 평수">
            {formatDecimal(consultation.desiredPyeongMin)}~
            {formatDecimal(consultation.desiredPyeongMax)}평{' '}
            <span className="text-[var(--muted)]">
              (약 {formatDecimal(pyeongToSquareMeters(consultation.desiredPyeongMin))}~
              {formatDecimal(pyeongToSquareMeters(consultation.desiredPyeongMax))}㎡)
            </span>
          </InfoItem>
          <InfoItem label="희망 임대료">{formatManwon(consultation.desiredRent)}</InfoItem>
          <InfoItem label="최대 가용 보증금">{formatManwon(consultation.maxDeposit)}</InfoItem>
          <InfoItem label="최대 가용 권리금">{formatManwon(consultation.maxPremium)}</InfoItem>
          <InfoItem label="예산">
            <span className="font-semibold">{formatManwon(consultation.budget)}</span>
          </InfoItem>
          <InfoItem label="유입 경로">{inflow}</InfoItem>
          <InfoItem label="상담 일자">{formatInquiryDate(consultation.consultedOn)}</InfoItem>
        </dl>

        <KkiruLogPanel
          entries={consultation.records}
          onAdd={async (input) => onChange(await addConsultationRecord(consultation.code, input))}
          onUpdate={async (recordId, input) =>
            onChange(await updateConsultationRecord(consultation.code, recordId, input))
          }
          title="상담 내용"
        />

        <ConsultationListings consultation={consultation} onChange={onChange} />
        <ConsultationMeetings consultation={consultation} />
        <ConsultationContracts consultation={consultation} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
        <Link
          className={SECONDARY_BUTTON_CLASS_NAME}
          href={`/kkiru/consultations/${consultation.code}/edit`}
        >
          수정
        </Link>
        {consultation.status === 'contracted' ? null : (
          <Link
            className={PRIMARY_BUTTON_CLASS_NAME}
            href={`/kkiru/meetings/new?consultation=${consultation.code}`}
          >
            미팅 진행
          </Link>
        )}
      </footer>
    </article>
  );
}

export function KkiruConsultationDetailView({ code }: { code: string }) {
  return (
    <KkiruLoader load={getConsultation} loadKey={code} noun="상담">
      {(consultation, replace) => (
        <ConsultationBody consultation={consultation} onChange={replace} />
      )}
    </KkiruLoader>
  );
}
