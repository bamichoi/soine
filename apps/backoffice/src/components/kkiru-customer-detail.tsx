'use client';

import Link from 'next/link';
import { CopyCodeButton } from '@/components/copy-code-button';
import { Icon } from '@/components/icon';
import { KkiruCustomerLoader } from '@/components/kkiru-customer-form';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { formatInquiryDate } from '@/lib/choidolsang-inquiries-api';
import type { KkiruCustomerDetail } from '@/lib/kkiru-customers-api';
import { CONSULTATION_STATUS_LABELS } from '@/lib/kkiru-status';
import { formatPhone } from '@/lib/phone';

const SECONDARY_BUTTON_CLASS_NAME =
  'flex h-10 items-center border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]';

function CustomerBody({ customer }: { customer: KkiruCustomerDetail }) {
  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">고객 번호</span>
          <span className="font-mono tracking-wide">{customer.code}</span>
          <CopyCodeButton code={customer.code} label="고객 번호" />
        </header>

        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-[var(--muted)]">이름</dt>
            <dd className="text-sm">{customer.name}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-[var(--muted)]">연락처</dt>
            <dd className="text-sm tabular-nums">{formatPhone(customer.phone)}</dd>
          </div>
        </dl>

        <section aria-label="상담" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs text-[var(--muted)]">상담 {customer.consultations.length}건</h3>
            <Link
              className="inline-flex h-8 items-center gap-1 border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-medium hover:bg-[var(--background)]"
              href={`/kkiru/consultations/new?customer=${customer.code}`}
            >
              <Icon className="size-3.5" name="plus" />
              상담 추가
            </Link>
          </div>
          {customer.consultations.length > 0 ? (
            <ul className="flex flex-col border border-[var(--line)]">
              {customer.consultations.map((consultation) => (
                <li
                  className="border-b border-[var(--line)] last:border-b-0"
                  key={consultation.code}
                >
                  <Link
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--background)]"
                    href={`/kkiru/consultations/${consultation.code}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{consultation.title}</span>
                      <span className="text-xs text-[var(--muted)] tabular-nums">
                        <span className="font-mono">{consultation.code}</span> ·{' '}
                        {formatInquiryDate(consultation.consultedOn)}
                      </span>
                    </span>
                    <KkiruStatusBadge
                      label={CONSULTATION_STATUS_LABELS[consultation.status]}
                      status={consultation.status}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">아직 상담이 없습니다.</p>
          )}
        </section>
      </div>

      <footer className="flex gap-2 border-t border-[var(--line)] px-6 py-4">
        <Link
          className={SECONDARY_BUTTON_CLASS_NAME}
          href={`/kkiru/customers/${customer.code}/edit`}
        >
          수정
        </Link>
      </footer>
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
