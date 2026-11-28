'use client';

import Link from 'next/link';
import { Icon } from '@/components/icon';
import { KkiruCustomerLoader } from '@/components/kkiru-customer-form';
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
import { KkiruGroupHead } from '@/components/kkiru-parts';
import { PhoneNumber } from '@/components/phone-number';
import { formatInquiryDate, formatSeoulDateTime } from '@/lib/choidolsang-inquiries-api';
import type { KkiruCustomerDetail } from '@/lib/kkiru-customers-api';
import { formatCount } from '@/lib/kkiru-format';
import { MEETING_STATUS_LABELS } from '@/lib/kkiru-status';
import { SECONDARY_BUTTON_CLASS_NAME, SMALL_BUTTON_CLASS_NAME } from '@/lib/kkiru-ui';

/** 고객의 미팅 열 = 미팅 | 미팅 일시 | 상태 | > */
const MEETING_GRID_CLASS_NAME = 'md:grid-cols-[minmax(0,1fr)_140px_104px_24px]';

function CustomerMeetings({ customer }: { customer: KkiruCustomerDetail }) {
  return (
    <>
      <KkiruGroupHead count={`${formatCount(customer.meetings.length)}건`} title="미팅">
        <Link
          className={SMALL_BUTTON_CLASS_NAME}
          href={`/kkiru/meetings/new?customer=${customer.code}`}
        >
          <Icon className="size-3.5" name="plus" />새 미팅
        </Link>
      </KkiruGroupHead>
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
                href={`/kkiru/meetings/${meeting.code}`}
                key={meeting.code}
                linkLabel={`미팅 ${meeting.title} 보기`}
              >
                <DetailListTitle code={meeting.code} name={meeting.title} />
                <span className="text-sm font-semibold tabular-nums">
                  {formatSeoulDateTime(meeting.meetAt)}
                </span>
                <DetailListBadge
                  mobileLabel="상태"
                  status={{ label: MEETING_STATUS_LABELS[meeting.status], value: meeting.status }}
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

function CustomerBody({ customer }: { customer: KkiruCustomerDetail }) {
  return (
    <article>
      <KkiruDetailHead
        actions={
          <Link
            className={SECONDARY_BUTTON_CLASS_NAME}
            href={`/kkiru/customers/${customer.code}/edit`}
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

export function KkiruCustomerDetailView({ code }: { code: string }) {
  return (
    <KkiruCustomerLoader code={code}>
      {(customer) => <CustomerBody customer={customer} />}
    </KkiruCustomerLoader>
  );
}
