'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CodeHeader, InfoItem, SectionTitle } from '@/components/kkiru-detail-parts';
import { KkiruLoader } from '@/components/kkiru-loader';
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
} from '@/lib/kkiru-cases-api';
import { formatArea, formatManwon } from '@/lib/kkiru-format';
import { CONTRACT_STATUS_LABELS } from '@/lib/kkiru-status';
import { PRIMARY_BUTTON_CLASS_NAME, SECONDARY_BUTTON_CLASS_NAME } from '@/lib/kkiru-ui';

const LINK_CHIP_CLASS_NAME =
  'flex h-7 items-center border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium hover:bg-[var(--background)]';

function ContractHistory({ contract }: { contract: ContractDetail }) {
  return (
    <section
      aria-label="계약 히스토리"
      className="flex flex-col gap-3 bg-[var(--background)] px-5 py-4"
    >
      <SectionTitle>계약 히스토리 (상담·미팅 기록)</SectionTitle>
      <ol className="flex flex-col divide-y divide-[var(--line)]">
        {contract.history.map((entry) => {
          const kindLabel = MEETING_RECORD_KIND_LABELS[entry.kind];

          return (
            <li
              className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
              key={`${entry.source}-${entry.id}`}
            >
              <span className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="bg-[var(--surface)] px-1.5 py-0.5 font-medium text-[var(--muted)]">
                  {entry.source === 'consultation' ? '상담' : '미팅'}
                </span>
                {kindLabel ? (
                  <span className="font-medium text-[var(--warning)]">{kindLabel}</span>
                ) : null}
                <span className="text-[var(--muted)] tabular-nums">
                  {formatInquiryDate(entry.recordedOn)}
                </span>
              </span>
              <p className="text-sm leading-6 break-words whitespace-pre-wrap">{entry.content}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ContractActions({
  contract,
  onChange,
}: {
  contract: ContractDetail;
  onChange: (next: ContractDetail) => void;
}) {
  const [dialog, setDialog] = useState<'complete' | 'cancel' | null>(null);

  if (contract.status !== 'contracting') {
    return null;
  }

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4">
      <Link className={SECONDARY_BUTTON_CLASS_NAME} href={`/kkiru/contracts/${contract.id}/edit`}>
        수정
      </Link>
      <div className="flex gap-2">
        <button
          className={`${SECONDARY_BUTTON_CLASS_NAME} text-[var(--error)]`}
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
      </div>

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
        message="계약을 완료로 바꾸면 미팅·상담도 계약완료가 되고, 매물은 계약완료로 바뀝니다. 되돌릴 수 없습니다."
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          onChange(await completeContract(contract.id));
          setDialog(null);
        }}
        pendingLabel="처리 중..."
        title="계약 완료"
      />
    </footer>
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
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-6 p-6">
        <CodeHeader
          code={contract.caseCode}
          label="케이스 번호"
          status={contract.status}
          statusLabel={CONTRACT_STATUS_LABELS[contract.status]}
        >
          <Link className={LINK_CHIP_CLASS_NAME} href={`/kkiru/consultations/${contract.caseCode}`}>
            상담 기록
          </Link>
          <Link className={LINK_CHIP_CLASS_NAME} href={`/kkiru/meetings/${contract.meetingId}`}>
            미팅 기록
          </Link>
        </CodeHeader>

        {contract.status === 'cancelled' && contract.cancelReason ? (
          <section
            aria-label="취소 사유"
            className="flex flex-col gap-1 bg-[var(--error-soft)] px-5 py-4"
          >
            <h3 className="text-xs font-medium text-[var(--error)]">계약취소 사유</h3>
            <p className="text-sm leading-6 break-words whitespace-pre-wrap">
              {contract.cancelReason}
            </p>
          </section>
        ) : null}

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
              {listing.address} · {formatArea(listing.areaM2)} · {listing.floor}
            </span>
          </Link>
        </section>

        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <InfoItem label="계약 일자">{formatInquiryDate(contract.contractedOn)}</InfoItem>
          <InfoItem label="임차인">
            <Link
              className="text-[var(--brand)] underline-offset-2 hover:underline"
              href={`/kkiru/customers/${contract.customer.code}`}
            >
              {contract.customer.name}
            </Link>{' '}
            <PhoneNumber className="text-[var(--muted)]" phone={contract.customer.phone} />
          </InfoItem>
          <InfoItem label="임대인">
            {contract.landlordName}{' '}
            <PhoneNumber className="text-[var(--muted)]" phone={contract.landlordPhone} />
          </InfoItem>
          <InfoItem label="보증금">{formatManwon(contract.deposit)}</InfoItem>
          <InfoItem label="임대료">{formatManwon(contract.rent)}</InfoItem>
          <InfoItem label="권리금">{formatManwon(contract.premium)}</InfoItem>
          <InfoItem label="임대차 기간">
            {formatInquiryDate(contract.leaseStartOn)} ~ {formatInquiryDate(contract.leaseEndOn)}
          </InfoItem>
          <InfoItem label="계약금">{formatManwon(contract.downPayment)}</InfoItem>
          <InfoItem label="수수료">
            <span className="font-semibold">{formatManwon(contract.commission)}</span>
          </InfoItem>
          <InfoItem label="내 매물">{contract.isMyListing ? '예' : '아니오'}</InfoItem>
          <InfoItem label="내 손님">{contract.isMyClient ? '예' : '아니오'}</InfoItem>
        </dl>

        <section
          aria-label="특약 사항"
          className="flex flex-col gap-2 border-t border-[var(--line)] pt-5"
        >
          <SectionTitle>특약 사항</SectionTitle>
          <p className="text-sm leading-6 break-words whitespace-pre-wrap">
            {contract.specialTerms ?? <span className="text-[var(--muted)]">없음</span>}
          </p>
        </section>

        <ContractHistory contract={contract} />
      </div>
      <ContractActions contract={contract} onChange={onChange} />
    </article>
  );
}

export function KkiruContractDetailView({ id }: { id: string }) {
  return (
    <KkiruLoader load={getContract} loadKey={id} noun="계약">
      {(contract, replace) => <ContractBody contract={contract} onChange={replace} />}
    </KkiruLoader>
  );
}
