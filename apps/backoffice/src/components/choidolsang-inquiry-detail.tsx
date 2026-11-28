'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DataLoader } from '@/components/data-loader';
import {
  DetailHead,
  InfoGroup,
  InfoItem,
  InfoLink,
  InfoSheet,
  InfoTextGroup,
} from '@/components/detail-parts';
import { InquiryContentLog } from '@/components/inquiry-content-log';
import { InquiryRejectDialog } from '@/components/inquiry-reject-dialog';
import { InquiryStatusBadge } from '@/components/inquiry-status-badge';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  formatInquiryDate,
  formatSeoulDateTime,
  getFirstLine,
  getInquiry,
  type InquiryDetail,
  reopenInquiry,
} from '@/lib/choidolsang-inquiries-api';
import {
  DANGER_BUTTON_CLASS_NAME,
  EMPTY_VALUE,
  ERROR_BOX_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

const LIST_PATH = '/choidolsang/inquiries';

const STALE_STATUS_MESSAGE = '이미 처리된 문의입니다. 화면을 새로고침해 주세요.';

// 삭제되지 않은 컨셉은 돌상 컨셉 상세로 이동할 수 있다.
function DesiredConcept({ concept }: { concept: InquiryDetail['desiredConcept'] }) {
  if (!concept) {
    return EMPTY_VALUE;
  }

  if (concept.isDeleted) {
    return (
      <>
        {concept.name} <span className="text-[var(--muted)]">(삭제됨)</span>
      </>
    );
  }

  return <InfoLink href={`/choidolsang/concepts/${concept.id}`}>{concept.name}</InfoLink>;
}

type InquiryActionsProps = {
  inquiry: InquiryDetail;
  onChange: (inquiry: InquiryDetail) => void;
  onError: (message: string) => void;
};

// 제목 줄 오른쪽 버튼 (보조 → 위험 → 주).
// 대기: [수정] [거절] [예약 진행] / 거절: [수정] [대기] [예약 진행] / 예약확정·취소: [수정] [예약 정보]
// 문의는 삭제하지 않는다.
function InquiryActions({ inquiry, onChange, onError }: InquiryActionsProps) {
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const querySuffix = listQuery ? `?${listQuery}` : '';
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const isClosed = inquiry.status === 'confirmed' || inquiry.status === 'cancelled';

  async function handleReopen() {
    onError('');
    setIsReopening(true);

    try {
      onChange(await reopenInquiry(inquiry.code));
    } catch (error) {
      onError(
        error instanceof AdminApiError && error.status === 409
          ? STALE_STATUS_MESSAGE
          : '대기로 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsReopening(false);
    }
  }

  return (
    <>
      <Link
        className={SECONDARY_BUTTON_CLASS_NAME}
        href={`${LIST_PATH}/${inquiry.code}/edit${querySuffix}`}
      >
        수정
      </Link>
      {inquiry.status === 'pending' ? (
        <button
          className={DANGER_BUTTON_CLASS_NAME}
          onClick={() => setIsRejectOpen(true)}
          type="button"
        >
          거절
        </button>
      ) : null}
      {inquiry.status === 'rejected' ? (
        <button
          className={SECONDARY_BUTTON_CLASS_NAME}
          disabled={isReopening}
          onClick={handleReopen}
          type="button"
        >
          {isReopening ? '변경 중...' : '대기'}
        </button>
      ) : null}
      {isClosed ? (
        // 예약확정·취소 문의는 이어진 예약으로 간다.
        inquiry.reservationCode ? (
          <Link
            className={PRIMARY_BUTTON_CLASS_NAME}
            href={`/choidolsang/reservations/${inquiry.reservationCode}`}
          >
            예약 정보
          </Link>
        ) : (
          <button
            className={PRIMARY_BUTTON_CLASS_NAME}
            disabled
            title="이어진 예약이 없습니다."
            type="button"
          >
            예약 정보
          </button>
        )
      ) : (
        <Link
          className={PRIMARY_BUTTON_CLASS_NAME}
          href={`/choidolsang/reservations/new?inquiry=${inquiry.code}`}
        >
          예약 진행
        </Link>
      )}

      <InquiryRejectDialog
        code={inquiry.code}
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onRejected={(rejected) => {
          setIsRejectOpen(false);
          onChange(rejected);
        }}
      />
    </>
  );
}

function InquiryBody({
  inquiry,
  onChange,
}: {
  inquiry: InquiryDetail;
  onChange: (inquiry: InquiryDetail) => void;
}) {
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <article>
      <DetailHead
        actions={<InquiryActions inquiry={inquiry} onChange={onChange} onError={setErrorMessage} />}
        badge={<InquiryStatusBadge status={inquiry.status} />}
        code={inquiry.code}
        codeLabel="문의"
        copyLabel="문의 번호"
        title={getFirstLine(inquiry.content)}
      />

      {errorMessage ? (
        <p className={`mb-3 ${ERROR_BOX_CLASS_NAME}`} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <InfoSheet label="문의 정보">
        <InfoGroup title="희망 예약">
          <InfoItem label="문의 날짜">
            <span className="tabular-nums">{formatInquiryDate(inquiry.inquiredOn)}</span>
          </InfoItem>
          <InfoItem label="희망 예약일시">
            {inquiry.desiredReservationAt ? (
              <span className="tabular-nums">
                {formatSeoulDateTime(inquiry.desiredReservationAt)}
              </span>
            ) : (
              EMPTY_VALUE
            )}
          </InfoItem>
          <InfoItem label="장소">{inquiry.location ?? EMPTY_VALUE}</InfoItem>
          <InfoItem label="희망 돌상 컨셉">
            <DesiredConcept concept={inquiry.desiredConcept} />
          </InfoItem>
        </InfoGroup>
        {inquiry.status === 'rejected' && inquiry.rejectionReason ? (
          <InfoTextGroup
            text={inquiry.rejectionReason}
            title="거절 사유"
            titleClassName="text-[var(--error)]"
          />
        ) : null}
      </InfoSheet>

      <InquiryContentLog inquiry={inquiry} onChange={onChange} />
    </article>
  );
}

export function ChoidolsangInquiryDetail({ code }: { code: string }) {
  return (
    <DataLoader load={getInquiry} loadKey={code} noun="문의">
      {(inquiry, replace) => <InquiryBody inquiry={inquiry} onChange={replace} />}
    </DataLoader>
  );
}
