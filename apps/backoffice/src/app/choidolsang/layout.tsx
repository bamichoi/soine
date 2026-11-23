import type { ReactNode } from 'react';
import { AdminServiceGate } from '@/components/admin-service-gate';

export default function ChoidolsangLayout({ children }: { children: ReactNode }) {
  return <AdminServiceGate service="choidolsang">{children}</AdminServiceGate>;
}
