import type { ReactNode } from 'react';
import { AdminServiceGate } from '@/components/admin-service-gate';

export default function KkiruLayout({ children }: { children: ReactNode }) {
  return <AdminServiceGate service="kkiru">{children}</AdminServiceGate>;
}
