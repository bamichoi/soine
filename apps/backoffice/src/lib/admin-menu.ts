import type { IconName } from '@/components/icon';
import type { AdminService } from '@/lib/admin-auth-api';

export type AdminMenuItem = {
  href: string;
  label: string;
  icon: IconName;
};

// 서비스별 백오피스 메뉴. 순서대로 사이드바에 표시한다.
export const ADMIN_MENUS: Record<AdminService, AdminMenuItem[]> = {
  choidolsang: [
    { href: '/choidolsang/schedule', icon: 'calendar', label: '일정' },
    { href: '/choidolsang/inquiries', icon: 'message', label: '문의' },
    { href: '/choidolsang/reservations', icon: 'clipboard-check', label: '예약' },
    { href: '/choidolsang/concepts', icon: 'sparkles', label: '돌상 컨셉' },
    { href: '/choidolsang/marketing', icon: 'megaphone', label: '마케팅' },
    { href: '/choidolsang/sales', icon: 'chart-bar', label: '매출' },
  ],
  goodplace: [
    { href: '/goodplace/schedule', icon: 'calendar', label: '일정' },
    { href: '/goodplace/listings', icon: 'home', label: '매물' },
    { href: '/goodplace/meetings', icon: 'handshake', label: '미팅' },
    { href: '/goodplace/contracts', icon: 'file-text', label: '계약' },
    { href: '/goodplace/customers', icon: 'users', label: '고객' },
    { href: '/goodplace/ads', icon: 'megaphone', label: '광고' },
    { href: '/goodplace/income', icon: 'wallet', label: '수입' },
  ],
};
