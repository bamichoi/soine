'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  DetailList,
  DetailListBadge,
  DetailListEmpty,
  DetailListRow,
  DetailListTitle,
  InfoGroup,
  InfoItem,
  InfoSheet,
  InfoTextGroup,
  KkiruDetailHead,
} from '@/components/kkiru-detail-parts';
import { KkiruListingForm, KkiruListingLoader } from '@/components/kkiru-listing-form';
import { KkiruLoader } from '@/components/kkiru-loader';
import { KkiruGroupHead } from '@/components/kkiru-parts';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { PhoneNumber } from '@/components/phone-number';
import { formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import { formatCount, formatDecimal, formatManwon, squareMetersToPyeong } from '@/lib/kkiru-format';
import {
  getKkiruListing,
  type KkiruListingDetail,
  type KkiruListingMeeting,
} from '@/lib/kkiru-listings-api';
import {
  CONTRACT_STATUS_LABELS,
  LISTING_STATUS_LABELS,
  MEETING_STATUS_LABELS,
} from '@/lib/kkiru-status';
import { EMPTY_VALUE, SECONDARY_BUTTON_CLASS_NAME } from '@/lib/kkiru-ui';

function parkingLabel(hasParking: boolean | null): ReactNode {
  if (hasParking === null) {
    return EMPTY_VALUE;
  }

  return hasParking ? '가능' : '불가';
}

const MEETING_GRID_CLASS_NAME = 'md:grid-cols-[minmax(0,1fr)_136px_104px_104px]';

function ListingMeetingRow({ meeting }: { meeting: KkiruListingMeeting }) {
  return (
    <DetailListRow
      gridClassName={MEETING_GRID_CLASS_NAME}
      href={`/kkiru/meetings/${meeting.code}`}
      linkLabel={`미팅 ${meeting.title} 보기`}
    >
      <DetailListTitle
        description={
          <>
            {meeting.customer.name} ·{' '}
            <span className="font-mono" translate="no">
              {meeting.code}
            </span>
          </>
        }
        name={meeting.title}
      />
      <span className="text-sm font-semibold tabular-nums">
        {formatSeoulDateTime(meeting.meetAt)}
      </span>
      <DetailListBadge
        mobileLabel="미팅"
        status={{ label: MEETING_STATUS_LABELS[meeting.status], value: meeting.status }}
      />
      <DetailListBadge
        emptyLabel="계약 없음"
        mobileLabel="이 매물 계약"
        status={
          meeting.contract
            ? {
                label: CONTRACT_STATUS_LABELS[meeting.contract.status],
                value: meeting.contract.status,
              }
            : null
        }
      />
    </DetailListRow>
  );
}

/** 이 매물이 미팅 매물로 걸린 미팅 내역. 0건이어도 묶음은 보인다. */
function ListingMeetings({ meetings }: { meetings: KkiruListingMeeting[] }) {
  return (
    <>
      <KkiruGroupHead count={`${formatCount(meetings.length)}건`} title="미팅 내역" />
      <DetailList
        columns={['미팅', '미팅 일시', '미팅 상태', '이 매물 계약']}
        gridClassName={MEETING_GRID_CLASS_NAME}
        label="미팅 내역"
      >
        {meetings.length > 0 ? (
          <ul>
            {meetings.map((meeting) => (
              <ListingMeetingRow key={meeting.code} meeting={meeting} />
            ))}
          </ul>
        ) : (
          <DetailListEmpty text="아직 이 매물로 한 미팅이 없습니다." />
        )}
      </DetailList>
    </>
  );
}

function ListingBody({ listing }: { listing: KkiruListingDetail }) {
  return (
    <article>
      <KkiruDetailHead
        actions={
          <Link
            className={SECONDARY_BUTTON_CLASS_NAME}
            href={`/kkiru/listings/${listing.code}/edit`}
          >
            수정
          </Link>
        }
        code={listing.code}
        codeLabel="매물"
        copyLabel="매물 번호"
        title={listing.name}
      />

      <InfoSheet label="매물 정보">
        {/* 상태를 맨 앞 칸에 두고, 4칸에 맞게 상태·면적·층수·임대 형태를 한 묶음으로 둔다. */}
        <InfoGroup title="매물">
          <InfoItem label="상태">
            <KkiruStatusBadge
              label={LISTING_STATUS_LABELS[listing.status]}
              status={listing.status}
            />
          </InfoItem>
          <InfoItem
            label="면적"
            sub={`약 ${formatDecimal(squareMetersToPyeong(listing.areaM2))}평`}
          >
            <span className="tabular-nums">{formatDecimal(listing.areaM2, 2)}㎡</span>
          </InfoItem>
          <InfoItem label="층수">{listing.floor}</InfoItem>
          <InfoItem label="임대 형태">임대</InfoItem>
          <InfoItem className="col-span-2 md:col-span-4" label="주소">
            {listing.address}
          </InfoItem>
        </InfoGroup>
        <InfoGroup title="임대 조건">
          <InfoItem isMoney label="보증금">
            {formatManwon(listing.deposit)}
          </InfoItem>
          <InfoItem isMoney label="임대료">
            월 {formatManwon(listing.rent)}
          </InfoItem>
          <InfoItem isMoney label="권리금">
            {formatManwon(listing.premium)}
          </InfoItem>
        </InfoGroup>
        <InfoGroup title="의뢰인·시설">
          <InfoItem label="의뢰인">{listing.clientName}</InfoItem>
          <InfoItem label="의뢰인 연락처">
            <PhoneNumber phone={listing.clientPhone} />
          </InfoItem>
          <InfoItem label="주차">{parkingLabel(listing.hasParking)}</InfoItem>
          <InfoItem label="화장실">
            {listing.restroomCount === null ? EMPTY_VALUE : `${listing.restroomCount}개`}
          </InfoItem>
        </InfoGroup>
        <InfoTextGroup text={listing.features} title="특징" />
      </InfoSheet>

      <ListingMeetings meetings={listing.meetings} />
    </article>
  );
}

export function KkiruListingDetailView({ code }: { code: string }) {
  return (
    <KkiruLoader load={getKkiruListing} loadKey={code} noun="매물">
      {(listing) => <ListingBody listing={listing} />}
    </KkiruLoader>
  );
}

export function KkiruListingEdit({ code }: { code: string }) {
  return (
    <KkiruListingLoader code={code}>
      {(listing) => <KkiruListingForm listing={listing} />}
    </KkiruListingLoader>
  );
}
