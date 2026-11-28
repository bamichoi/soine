import { StatusBadge } from '@/components/status-badge';
import { statusTone } from '@/lib/goodplace-status';

// 굿플레이스 상태 값(API 값)을 색으로 바꿔 공통 상태 배지로 보여 준다.
export function GoodplaceStatusBadge({ status, label }: { status: string; label: string }) {
  return <StatusBadge label={label} tone={statusTone(status)} />;
}
