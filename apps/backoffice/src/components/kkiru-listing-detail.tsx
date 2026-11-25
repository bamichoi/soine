'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruListingForm, KkiruListingLoader } from '@/components/kkiru-listing-form';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { formatArea, formatManwon } from '@/lib/kkiru-format';
import type { KkiruListing } from '@/lib/kkiru-listings-api';
import { LISTING_STATUS_LABELS } from '@/lib/kkiru-status';
import { formatPhone } from '@/lib/phone';

const EMPTY_VALUE = <span className="text-[var(--muted)]">-</span>;

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function parkingLabel(hasParking: boolean | null): ReactNode {
  if (hasParking === null) {
    return EMPTY_VALUE;
  }

  return hasParking ? '가능' : '불가';
}

function ListingBody({ listing }: { listing: KkiruListing }) {
  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">매물 번호</span>
            <span className="font-mono tracking-wide">{listing.code}</span>
            <CopyCodeButton code={listing.code} label="매물 번호" />
          </p>
          <KkiruStatusBadge label={LISTING_STATUS_LABELS[listing.status]} status={listing.status} />
        </header>

        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold break-words">{listing.name}</h3>
          <p className="text-sm text-[var(--muted)] break-words">{listing.address}</p>
        </div>

        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <InfoItem label="면적">{formatArea(listing.areaM2)}</InfoItem>
          <InfoItem label="층수">{listing.floor}</InfoItem>
          <InfoItem label="임대 형태">임대</InfoItem>
          <InfoItem label="보증금">{formatManwon(listing.deposit)}</InfoItem>
          <InfoItem label="임대료">{formatManwon(listing.rent)}</InfoItem>
          <InfoItem label="권리금">{formatManwon(listing.premium)}</InfoItem>
          <InfoItem label="주차">{parkingLabel(listing.hasParking)}</InfoItem>
          <InfoItem label="화장실">
            {listing.restroomCount === null ? EMPTY_VALUE : `${listing.restroomCount}개`}
          </InfoItem>
        </dl>

        <section aria-label="특징" className="flex flex-col gap-2 bg-[var(--background)] px-5 py-4">
          <h4 className="text-xs text-[var(--muted)]">특징</h4>
          <p className="text-sm leading-6 break-words whitespace-pre-wrap">
            {listing.features ?? <span className="text-[var(--muted)]">없음</span>}
          </p>
        </section>

        <dl className="grid gap-x-8 gap-y-5 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
          <InfoItem label="의뢰인">{listing.clientName}</InfoItem>
          <InfoItem label="의뢰인 연락처">
            <span className="tabular-nums">{formatPhone(listing.clientPhone)}</span>
          </InfoItem>
        </dl>
      </div>

      <footer className="flex gap-2 border-t border-[var(--line)] px-6 py-4">
        <Link
          className="flex h-10 items-center border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]"
          href={`/kkiru/listings/${listing.code}/edit`}
        >
          수정
        </Link>
      </footer>
    </article>
  );
}

export function KkiruListingDetailView({ code }: { code: string }) {
  return (
    <KkiruListingLoader code={code}>
      {(listing) => <ListingBody listing={listing} />}
    </KkiruListingLoader>
  );
}

export function KkiruListingEdit({ code }: { code: string }) {
  return (
    <KkiruListingLoader code={code}>
      {(listing) => <KkiruListingForm listing={listing} />}
    </KkiruListingLoader>
  );
}
