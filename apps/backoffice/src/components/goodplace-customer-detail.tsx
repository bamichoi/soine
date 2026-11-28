'use client';

import Link from 'next/link';
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
import { GoodplaceCustomerLoader } from '@/components/goodplace-customer-form';
import { GoodplaceStatusBadge } from '@/components/goodplace-status-badge';
import { Icon } from '@/components/icon';
import { GroupHead } from '@/components/page-parts';
import { PhoneNumber } from '@/components/phone-number';
import { formatInquiryDate, formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import type { GoodplaceCustomerDetail } from '@/lib/goodplace-customers-api';
import { formatCount } from '@/lib/goodplace-format';
import { MEETING_STATUS_LABELS } from '@/lib/goodplace-status';
import { SECONDARY_BUTTON_CLASS_NAME, SMALL_BUTTON_CLASS_NAME } from '@/lib/ui';

/** 고객의 미팅 열 = 미팅 | 미팅 일시 | 상태 | > */
const MEETING_GRID_CLASS_NAME = 'md:grid-cols-[minmax(0,1fr)_140px_104px_24px]';

function CustomerMeetings({ customer }: { customer: GoodplaceCustomerDetail }) {
  return (
    <>
      <GroupHead count={`${formatCount(customer.meetings.length)}건`} title="미팅">
        <Link
          className={SMALL_BUTTON_CLASS_NAME}
          href={`/goodplace/meetings/new?customer=${customer.code}`}
        >
          <Icon className="size-3.5" name="plus" />새 미팅
        </Link>
      </GroupHead>
      <DetailList
        columns={['미팅', '미팅 일시', '상태', '']}
        gridClassName={MEETING_GRID_CLASS_NAME}
        label="미팅"
      >
        {customer.meetings.length > 0 ? (
          <ul>
            {customer.meetings.map((meeting) => (
              <DetailListRow
                gridClassName={MEETING_GRID_CLASS_NAME}
                href={`/goodplace/meetings/${meeting.code}`}
                key={meeting.code}
                linkLabel={`미팅 ${meeting.title} 보기`}
              >
                <DetailListTitle code={meeting.code} name={meeting.title} />
                <span className="text-sm font-semibold tabular-nums">
                  {formatSeoulDateTime(meeting.meetAt)}
                </span>
                <DetailListBadge
                  mobileLabel="상태"
                  badge={
                    <GoodplaceStatusBadge
                      label={MEETING_STATUS_LABELS[meeting.status]}
                      status={meeting.status}
                    />
                  }
                />
                <Icon
                  className="ml-auto hidden size-4 text-[var(--muted)]/70 md:block"
                  name="chevron-right"
                />
              </DetailListRow>
            ))}
          </ul>
        ) : (
          <DetailListEmpty text="아직 미팅이 없습니다." />
        )}
      </DetailList>
    </>
  );
}

function CustomerBody({ customer }: { customer: GoodplaceCustomerDetail }) {
  return (
    <article>
      <DetailHead
        actions={
          <Link
            className={SECONDARY_BUTTON_CLASS_NAME}
            href={`/goodplace/customers/${customer.code}/edit`}
          >
            수정
          </Link>
        }
        code={customer.code}
        codeLabel="고객"
        copyLabel="고객 번호"
        title={customer.name}
      />

      <InfoSheet label="고객 정보">
        <InfoGroup title="연락처">
          <InfoItem label="연락처">
            <PhoneNumber phone={customer.phone} />
          </InfoItem>
          <InfoItem label="미팅">
            <span className="tabular-nums">{formatCount(customer.meetings.length)}건</span>
          </InfoItem>
          <InfoItem label="등록일">
            <span className="tabular-nums">
              {formatInquiryDate(customer.createdAt.slice(0, 10))}
            </span>
          </InfoItem>
        </InfoGroup>
        <InfoTextGroup text={customer.memo} title="메모" />
      </InfoSheet>

      <CustomerMeetings customer={customer} />
    </article>
  );
}

export function GoodplaceCustomerDetailView({ code }: { code: string }) {
  return (
    <GoodplaceCustomerLoader code={code}>
      {(customer) => <CustomerBody customer={customer} />}
    </GoodplaceCustomerLoader>
  );
}
