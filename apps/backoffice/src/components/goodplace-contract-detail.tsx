'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataLoader } from '@/components/data-loader';
import {
  DetailHead,
  InfoGroup,
  InfoItem,
  InfoLink,
  InfoSheet,
  InfoTextGroup,
} from '@/components/detail-parts';
import { GoodplaceStatusBadge } from '@/components/goodplace-status-badge';
import { LogPanel } from '@/components/log-panel';
import { PhoneNumber } from '@/components/phone-number';
import { ReasonDialog } from '@/components/reason-dialog';
import { AdminApiError } from '@/lib/admin-auth-api';
import { formatInquiryDate } from '@/lib/choidolsang-inquiries-api';
import {
  type ContractDetail,
  cancelContract,
  completeContract,
  getContract,
  MEETING_RECORD_KIND_LABELS,
} from '@/lib/goodplace-cases-api';
import { formatArea, formatManwon } from '@/lib/goodplace-format';
import { CONTRACT_STATUS_LABELS } from '@/lib/goodplace-status';
import {
  DANGER_BUTTON_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

/** 제목 줄 오른쪽 버튼. 계약예정일 때만 [수정][계약 취소][계약 완료]를 더한다. */
function ContractActions({
  contract,
  onChange,
}: {
  contract: ContractDetail;
  onChange: (next: ContractDetail) => void;
}) {
  const [dialog, setDialog] = useState<'complete' | 'cancel' | null>(null);
  const isContracting = contract.status === 'contracting';

  return (
    <>
      <Link
        className={SECONDARY_BUTTON_CLASS_NAME}
        href={`/goodplace/meetings/${contract.caseCode}`}
      >
        미팅 기록
      </Link>
      {isContracting ? (
        <>
          <Link
            className={SECONDARY_BUTTON_CLASS_NAME}
            href={`/goodplace/contracts/${contract.id}/edit`}
          >
            수정
          </Link>
          <button
            className={DANGER_BUTTON_CLASS_NAME}
            onClick={() => setDialog('cancel')}
            type="button"
          >
            계약 취소
          </button>
          <button
            className={PRIMARY_BUTTON_CLASS_NAME}
            onClick={() => setDialog('complete')}
            type="button"
          >
            계약 완료
          </button>

          <ReasonDialog
            confirmLabel="계약 취소"
            isOpen={dialog === 'cancel'}
            label="취소 사유"
            onClose={() => setDialog(null)}
            onConfirm={async (reason) => {
              onChange(await cancelContract(contract.id, reason));
              setDialog(null);
            }}
            title="계약 취소"
            tone="danger"
          />
          <ConfirmDialog
            confirmLabel="계약 완료"
            getErrorMessage={(error) =>
              error instanceof AdminApiError && error.status === 409
                ? '이미 처리된 계약입니다. 화면을 새로고침해 주세요.'
                : '계약 완료로 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.'
            }
            isOpen={dialog === 'complete'}
            message="계약을 완료로 바꾸면 미팅과 매물이 계약완료로 바뀝니다. 되돌릴 수 없습니다."
            onClose={() => setDialog(null)}
            onConfirm={async () => {
              onChange(await completeContract(contract.id));
              setDialog(null);
            }}
            pendingLabel="처리 중..."
            title="계약 완료"
          />
        </>
      ) : null}
    </>
  );
}

function ContractBody({
  contract,
  onChange,
}: {
  contract: ContractDetail;
  onChange: (next: ContractDetail) => void;
}) {
  const { listing } = contract;

  return (
    <article>
      <DetailHead
        actions={<ContractActions contract={contract} onChange={onChange} />}
        code={contract.caseCode}
        codeLabel="케이스"
        copyLabel="케이스 번호"
        badge={
          <GoodplaceStatusBadge
            label={CONTRACT_STATUS_LABELS[contract.status]}
            status={contract.status}
          />
        }
        title={listing.name}
      />

      <InfoSheet label="계약 정보">
        {contract.status === 'cancelled' && contract.cancelReason ? (
          <InfoTextGroup
            text={contract.cancelReason}
            title="취소 사유"
            titleClassName="text-[var(--error)]"
          />
        ) : null}
        <InfoGroup title="당사자">
          <InfoItem label="임차인">
            <InfoLink href={`/goodplace/customers/${contract.customer.code}`}>
              {contract.customer.name}
            </InfoLink>
          </InfoItem>
          <InfoItem label="임차인 연락처">
            <PhoneNumber phone={contract.customer.phone} />
          </InfoItem>
          <InfoItem label="임대인">{contract.landlordName}</InfoItem>
          <InfoItem label="임대인 연락처">
            <PhoneNumber phone={contract.landlordPhone} />
          </InfoItem>
        </InfoGroup>
        <InfoGroup title="대상 매물">
          <InfoItem label="매물 번호">
            <InfoLink href={`/goodplace/listings/${listing.code}`}>
              <span className="font-mono" translate="no">
                {listing.code}
              </span>
            </InfoLink>
          </InfoItem>
          <InfoItem className="md:col-span-2" label="주소">
            {listing.address}
          </InfoItem>
          <InfoItem label="면적·층수" sub={listing.floor}>
            <span className="tabular-nums">{formatArea(listing.areaM2)}</span>
          </InfoItem>
        </InfoGroup>
        <InfoGroup title="임대 조건">
          <InfoItem isMoney label="보증금">
            {formatManwon(contract.deposit)}
          </InfoItem>
          <InfoItem isMoney label="임대료">
            월 {formatManwon(contract.rent)}
          </InfoItem>
          <InfoItem isMoney label="권리금">
            {formatManwon(contract.premium)}
          </InfoItem>
          <InfoItem label="임대차 기간">
            <span className="tabular-nums">
              {formatInquiryDate(contract.leaseStartOn)} ~ {formatInquiryDate(contract.leaseEndOn)}
            </span>
          </InfoItem>
        </InfoGroup>
        <InfoGroup title="일정·금액">
          <InfoItem label="계약 일자">
            <span className="tabular-nums">{formatInquiryDate(contract.contractedOn)}</span>
          </InfoItem>
          <InfoItem isMoney label="계약금">
            {formatManwon(contract.downPayment)}
          </InfoItem>
          <InfoItem isMoney label="잔금">
            {formatManwon(contract.balance)}
          </InfoItem>
          <InfoItem label="잔금일">
            <span className="tabular-nums">{formatInquiryDate(contract.balanceDueOn)}</span>
          </InfoItem>
          <InfoItem isMoney label="수수료">
            {formatManwon(contract.commission)}
          </InfoItem>
          <InfoItem label="내 매물">{contract.isMyListing ? '예' : '아니오'}</InfoItem>
          <InfoItem label="내 손님">{contract.isMyClient ? '예' : '아니오'}</InfoItem>
        </InfoGroup>
        <InfoTextGroup text={contract.specialTerms} title="특약 사항" />
      </InfoSheet>

      {/* 계약 히스토리는 이 계약이 속한 미팅의 기록이다. 여기서는 읽기만 한다. */}
      <LogPanel
        entries={contract.history.map((entry) => ({
          ...entry,
          label: MEETING_RECORD_KIND_LABELS[entry.kind],
        }))}
        title="계약 히스토리"
      />
    </article>
  );
}

export function GoodplaceContractDetailView({ id }: { id: string }) {
  return (
    <DataLoader load={getContract} loadKey={id} noun="계약">
      {(contract, replace) => <ContractBody contract={contract} onChange={replace} />}
    </DataLoader>
  );
}
