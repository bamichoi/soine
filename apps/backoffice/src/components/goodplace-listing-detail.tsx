'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { DataLoader } from '@/components/data-loader';
import {
  DetailHead,
  DetailList,
  DetailListBadge,
  DetailListEmpty,
  DetailListRow,
  DetailListTitle,
  InfoGroup,
  InfoItem,
  InfoSheet,
  InfoTextGroup,
} from '@/components/detail-parts';
import { GoodplaceListingForm, GoodplaceListingLoader } from '@/components/goodplace-listing-form';
import { GoodplaceStatusBadge } from '@/components/goodplace-status-badge';
import { GroupHead } from '@/components/page-parts';
import { PhoneNumber } from '@/components/phone-number';
import { formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import {
  formatCount,
  formatDecimal,
  formatManwon,
  squareMetersToPyeong,
} from '@/lib/goodplace-format';
import {
  type GoodplaceListingDetail,
  type GoodplaceListingMeeting,
  getGoodplaceListing,
} from '@/lib/goodplace-listings-api';
import {
  CONTRACT_STATUS_LABELS,
  LISTING_STATUS_LABELS,
  MEETING_STATUS_LABELS,
} from '@/lib/goodplace-status';
import { EMPTY_VALUE, SECONDARY_BUTTON_CLASS_NAME } from '@/lib/ui';

function parkingLabel(hasParking: boolean | null): ReactNode {
  if (hasParking === null) {
    return EMPTY_VALUE;
  }

  return hasParking ? '가능' : '불가';
}

const MEETING_GRID_CLASS_NAME = 'md:grid-cols-[minmax(0,1fr)_136px_104px_104px]';

function ListingMeetingRow({ meeting }: { meeting: GoodplaceListingMeeting }) {
  return (
    <DetailListRow
      gridClassName={MEETING_GRID_CLASS_NAME}
      href={`/goodplace/meetings/${meeting.code}`}
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
        badge={
          <GoodplaceStatusBadge
            label={MEETING_STATUS_LABELS[meeting.status]}
            status={meeting.status}
          />
        }
      />
      <DetailListBadge
        emptyLabel="계약 없음"
        mobileLabel="이 매물 계약"
        badge={
          meeting.contract ? (
            <GoodplaceStatusBadge
              label={CONTRACT_STATUS_LABELS[meeting.contract.status]}
              status={meeting.contract.status}
            />
          ) : null
        }
      />
    </DetailListRow>
  );
}

/** 이 매물이 미팅 매물로 걸린 미팅 내역. 0건이어도 묶음은 보인다. */
function ListingMeetings({ meetings }: { meetings: GoodplaceListingMeeting[] }) {
  return (
    <>
      <GroupHead count={`${formatCount(meetings.length)}건`} title="미팅 내역" />
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

function ListingBody({ listing }: { listing: GoodplaceListingDetail }) {
  return (
    <article>
      <DetailHead
        actions={
          <Link
            className={SECONDARY_BUTTON_CLASS_NAME}
            href={`/goodplace/listings/${listing.code}/edit`}
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
            <GoodplaceStatusBadge
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

export function GoodplaceListingDetailView({ code }: { code: string }) {
  return (
    <DataLoader load={getGoodplaceListing} loadKey={code} noun="매물">
      {(listing) => <ListingBody listing={listing} />}
    </DataLoader>
  );
}

export function GoodplaceListingEdit({ code }: { code: string }) {
  return (
    <GoodplaceListingLoader code={code}>
      {(listing) => <GoodplaceListingForm listing={listing} />}
    </GoodplaceListingLoader>
  );
}
