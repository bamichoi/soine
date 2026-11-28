import type { ReactNode } from 'react';
import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';

export function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

/** 상세 머리줄: 번호(복사) + 상태 */
export function CodeHeader({
  label,
  code,
  status,
  statusLabel,
  children,
}: {
  label: string;
  code: string;
  status: string;
  statusLabel: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">{label}</span>
          <span className="font-mono tracking-wide">{code}</span>
          <CopyCodeButton code={code} label={label} />
        </p>
        {children}
      </div>
      <KkiruStatusBadge label={statusLabel} status={status} />
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs text-[var(--muted)]">{children}</h3>
      {action}
    </div>
  );
}
