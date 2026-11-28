'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import {
  DetailList,
  DetailListBadge,
  DetailListEmpty,
  DetailListRow,
  DetailListTitle,
  InfoGroup,
  InfoItem,
  InfoLink,
  InfoSheet,
  KkiruDetailHead,
} from '@/components/kkiru-detail-parts';
import { KkiruListingPicker } from '@/components/kkiru-listing-picker';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruLogPanel } from '@/components/kkiru-log-panel';
import { KkiruGroupHead } from '@/components/kkiru-parts';
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
import {
  formatArea,
  formatCount,
  formatDecimal,
  formatManwon,
  pyeongToSquareMeters,
} from '@/lib/kkiru-format';
import {
  CONTRACT_STATUS_LABELS,
  type KkiruListingStatus,
  LISTING_STATUS_LABELS,
  MEETING_STATUS_LABELS,
} from '@/lib/kkiru-status';
import {
  DANGER_BUTTON_CLASS_NAME,
  FOCUS_CLASS_NAME,
  ICON_BUTTON_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  ROW_ACTION_BUTTON_CLASS_NAME,
  ROW_ACTION_ICON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
  SMALL_BUTTON_CLASS_NAME,
  TEXT_BUTTON_CLASS_NAME,
} from '@/lib/kkiru-ui';

/** 미팅 매물 열 = 매물 | 매물 상태 | 이 미팅 계약 | 동작 */
const LISTING_GRID_CLASS_NAME = 'md:grid-cols-[minmax(0,1fr)_84px_104px_136px]';
/** 계약 열 = 매물 | 계약일 | 상태 | > */
const CONTRACT_GRID_CLASS_NAME = 'md:grid-cols-[minmax(0,1fr)_120px_104px_24px]';

/** 다른 고객이 계약 중이거나 계약완료된 매물로는 계약을 시작하지 않는다. */
const CONTRACTABLE_LISTING_STATUSES: KkiruListingStatus[] = ['available', 'meeting'];

function newContractHref(meetingCode: string, listingCode?: string): string {
  const params = new URLSearchParams({ meeting: meetingCode });

  if (listingCode) {
    params.set('listing', listingCode);
  }

  return `/kkiru/contracts/new?${params}`;
}

/** 줄 오른쪽의 세로 점(⋮) 메뉴. 지금은 '제거'만 있다. */
function RowMenu({ label, onRemove }: { label: string; onRemove: () => void }) {
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
        className={ICON_BUTTON_CLASS_NAME}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Icon className="size-4" name="more-vertical" />
      </button>
      {isOpen ? (
        <div
          className="absolute top-full right-0 z-20 mt-1 w-28 rounded-xl bg-[var(--surface)] p-1 shadow-[0_12px_40px_rgba(16,24,40,0.16)]"
          role="menu"
        >
          <button
            className={`w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--error)] hover:bg-[var(--background)] ${FOCUS_CLASS_NAME}`}
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
    <DetailListRow
      gridClassName={LISTING_GRID_CLASS_NAME}
      href={`/kkiru/listings/${listing.code}`}
      linkLabel={`매물 ${listing.name} 보기`}
    >
      <DetailListTitle
        code={listing.code}
        description={`${formatArea(listing.areaM2)} · ${listing.floor} · 보증금 ${formatManwon(listing.deposit)} / 월 ${formatManwon(listing.rent)} · 권리금 ${formatManwon(listing.premium)}`}
        name={listing.name}
      />
      <DetailListBadge
        mobileLabel="매물"
        status={{ label: LISTING_STATUS_LABELS[listing.status], value: listing.status }}
      />
      <DetailListBadge
        emptyLabel="계약 없음"
        mobileLabel="이 미팅 계약"
        status={
          listing.contractStatus
            ? {
                label: CONTRACT_STATUS_LABELS[listing.contractStatus],
                value: listing.contractStatus,
              }
            : null
        }
      />
      <div className="relative z-10 ml-auto flex items-center justify-end gap-1">
        {canContract ? (
          <Link
            className={ROW_ACTION_BUTTON_CLASS_NAME}
            href={newContractHref(meeting.code, listing.code)}
          >
            계약 진행
            <Icon className={ROW_ACTION_ICON_CLASS_NAME} name="chevron-right" />
          </Link>
        ) : null}
        {canRemove ? (
          <RowMenu label={`미팅 매물 ${listing.name}`} onRemove={() => setIsConfirming(true)} />
        ) : (
          // ⋮가 없는 줄도 같은 폭을 비워 열을 맞춘다.
          <span aria-hidden="true" className="size-8" />
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
        look="kkiru"
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
    </DetailListRow>
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

  // '매물 추가'를 누르면 카드 맨 위(열 머리 위)에 매물 검색 줄이 열린다.
  const picker = isAdding ? (
    <div className="flex flex-col gap-2 border-b border-[var(--line)]/60 px-3.5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold">매물 추가</h4>
        <button className={TEXT_BUTTON_CLASS_NAME} onClick={() => setIsAdding(false)} type="button">
          닫기
        </button>
      </div>
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
    </div>
  ) : null;

  return (
    <>
      <KkiruGroupHead count={`${formatCount(meeting.listings.length)}건`} title="미팅 매물">
        {isAdding ? null : (
          <button
            className={SMALL_BUTTON_CLASS_NAME}
            onClick={() => setIsAdding(true)}
            type="button"
          >
            <Icon className="size-3.5" name="plus" />
            매물 추가
          </button>
        )}
      </KkiruGroupHead>
      <DetailList
        columns={['매물', '매물 상태', '이 미팅 계약', '']}
        gridClassName={LISTING_GRID_CLASS_NAME}
        label="미팅 매물"
        top={picker}
      >
        {meeting.listings.length > 0 ? (
          <ul>
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
          <DetailListEmpty text="아직 미팅 매물이 없습니다." />
        )}
      </DetailList>
    </>
  );
}

/** 이 미팅의 계약. 0건이면 묶음째 숨긴다(여기서 추가할 수 없는 목록). */
function MeetingContracts({ meeting }: { meeting: MeetingDetail }) {
  if (meeting.contracts.length === 0) {
    return null;
  }

  return (
    <>
      <KkiruGroupHead count={`${formatCount(meeting.contracts.length)}건`} title="계약" />
      <DetailList
        columns={['매물', '계약일', '상태', '']}
        gridClassName={CONTRACT_GRID_CLASS_NAME}
        label="계약"
      >
        <ul>
          {meeting.contracts.map((contract) => (
            <DetailListRow
              gridClassName={CONTRACT_GRID_CLASS_NAME}
              href={`/kkiru/contracts/${contract.id}`}
              key={contract.id}
              linkLabel={`${contract.listing.name} 계약 보기`}
            >
              <DetailListTitle code={contract.listing.code} name={contract.listing.name} />
              <span className="text-sm font-semibold tabular-nums">
                {formatInquiryDate(contract.contractedOn)}
              </span>
              <DetailListBadge
                mobileLabel="상태"
                status={{ label: CONTRACT_STATUS_LABELS[contract.status], value: contract.status }}
              />
              <Icon
                className="ml-auto hidden size-4 text-[var(--muted)]/70 md:block"
                name="chevron-right"
              />
            </DetailListRow>
          ))}
        </ul>
      </DetailList>
    </>
  );
}

/**
 * 제목 줄 오른쪽 버튼.
 * 계약완료·계약중: [수정][계약 정보] / 미팅중·계약취소: [수정][미팅 중단][계약 진행] / 진행중단: [수정][미팅 재개]
 */
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
    <>
      <Link className={SECONDARY_BUTTON_CLASS_NAME} href={`/kkiru/meetings/${meeting.code}/edit`}>
        수정
      </Link>
      {canStop ? (
        <button
          className={DANGER_BUTTON_CLASS_NAME}
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
    </>
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
    <article>
      <KkiruDetailHead
        actions={<MeetingActions meeting={meeting} onChange={onChange} />}
        code={meeting.code}
        codeLabel="케이스"
        copyLabel="케이스 번호"
        status={{ label: MEETING_STATUS_LABELS[meeting.status], value: meeting.status }}
        title={meeting.title}
      />

      {/* 고객은 시트의 '고객' 묶음에만 둔다. 묶음 순서로만 중요도를 준다. */}
      <InfoSheet label="미팅 정보">
        <InfoGroup title="고객">
          <InfoItem label="이름">
            <InfoLink href={`/kkiru/customers/${customer.code}`}>{customer.name}</InfoLink>
          </InfoItem>
          <InfoItem label="연락처">
            <PhoneNumber phone={customer.phone} />
          </InfoItem>
          <InfoItem label="미팅 일시">
            <span className="tabular-nums">{formatSeoulDateTime(meeting.meetAt)}</span>
          </InfoItem>
          <InfoItem label="유입 경로">{inflow}</InfoItem>
        </InfoGroup>
        <InfoGroup title="찾는 조건">
          <InfoItem label="희망 업종">{meeting.desiredBusiness}</InfoItem>
          <InfoItem label="관심 상권">{meeting.interestArea}</InfoItem>
          <InfoItem
            label="희망 평수"
            sub={`약 ${formatDecimal(pyeongToSquareMeters(meeting.desiredPyeongMin))}~${formatDecimal(pyeongToSquareMeters(meeting.desiredPyeongMax))}㎡`}
          >
            <span className="tabular-nums">
              {formatDecimal(meeting.desiredPyeongMin)}~{formatDecimal(meeting.desiredPyeongMax)}평
            </span>
          </InfoItem>
          <InfoItem label="희망 층수">{meeting.desiredFloor}</InfoItem>
        </InfoGroup>
        <InfoGroup title="예산">
          <InfoItem isMoney label="예산" sub="보증금 + 권리금">
            {formatManwon(meeting.budget)}
          </InfoItem>
          <InfoItem isMoney label="최대 가용 보증금">
            {formatManwon(meeting.maxDeposit)}
          </InfoItem>
          <InfoItem isMoney label="최대 가용 권리금">
            {formatManwon(meeting.maxPremium)}
          </InfoItem>
          <InfoItem isMoney label="희망 임대료">
            월 {formatManwon(meeting.desiredRent)}
          </InfoItem>
        </InfoGroup>
      </InfoSheet>

      <MeetingListings meeting={meeting} onChange={onChange} />
      <MeetingContracts meeting={meeting} />

      <KkiruLogPanel
        entries={meeting.records.map((record) => ({
          ...record,
          label: MEETING_RECORD_KIND_LABELS[record.kind],
        }))}
        listingOptions={meeting.listings.map(({ id, name }) => ({ id, name }))}
        onAdd={async (input) => onChange(await addMeetingRecord(meeting.code, input))}
        onUpdate={async (recordId, input) =>
          onChange(await updateMeetingRecord(meeting.code, recordId, input))
        }
        title="미팅 내용"
      />
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
