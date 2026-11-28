import type { ReactNode } from 'react';
import { AdminServiceGate } from '@/components/admin-service-gate';

export default function GoodplaceLayout({ children }: { children: ReactNode }) {
  return <AdminServiceGate service="goodplace">{children}</AdminServiceGate>;
}
