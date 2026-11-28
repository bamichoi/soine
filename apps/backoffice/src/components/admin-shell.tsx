'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { ThemeMenu, ThemeSegment } from '@/components/theme-menu';
import { ADMIN_SERVICE_LABELS, type AdminService } from '@/lib/admin-auth-api';
import type { AdminMenuItem } from '@/lib/admin-menu';
import { FOCUS_CLASS_NAME, SMALL_BUTTON_CLASS_NAME } from '@/lib/ui';

type AdminShellProps = {
  service: AdminService;
  adminName: string;
  menuItems: AdminMenuItem[];
  isLoggingOut: boolean;
  onLogout: () => void;
  children: ReactNode;
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// 헤더·메뉴 클래스 (docs/design/goodplace-style-guide.md 5절, 시안 docs/design/goodplace-shell.html).
// 회색 페이지 바탕에 녹이고, 고른 메뉴 하나만 흰 알약으로 띄운다.
const ui = {
  // 회색 페이지 바탕에 녹인다(선·흰 바탕 없음). 모바일 56px, 데스크톱 64px.
  header:
    'sticky top-0 z-20 flex h-14 items-center justify-between gap-3 bg-[var(--background)] pr-2 pl-4 md:h-16 md:pr-8 md:pl-6',
  logoutIcon: 'size-3.5 text-[var(--muted)]',
  openButton: `grid size-10 shrink-0 cursor-pointer place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] active:bg-[var(--line)]/70 aria-expanded:bg-[var(--surface)] aria-expanded:text-[var(--foreground)] md:hidden ${FOCUS_CLASS_NAME}`,
  drawerIcon: 'size-[22px]',
  // 모바일은 오른쪽 서랍(회색 바탕, 왼쪽 모서리 20), 데스크톱은 바탕·오른쪽 선 없는 사이드 메뉴.
  aside:
    'fixed inset-y-0 right-0 z-40 flex w-72 max-w-[85vw] flex-col rounded-l-[20px] bg-[var(--background)] shadow-(--shadow-pop) transition-[translate,visibility] duration-200 md:visible md:sticky md:top-16 md:right-auto md:bottom-auto md:z-auto md:h-[calc(100vh-4rem)] md:w-60 md:max-w-none md:shrink-0 md:translate-x-0 md:rounded-none md:shadow-none md:transition-none',
  drawerHead: 'flex h-14 items-center justify-between pr-2 pl-5 md:hidden',
  drawerBrand: 'text-lg font-extrabold tracking-[-0.02em] text-[var(--brand)]',
  closeButton: `grid size-10 shrink-0 cursor-pointer place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] active:bg-[var(--line)]/70 ${FOCUS_CLASS_NAME}`,
  nav: 'flex-1 overflow-y-auto px-3 py-1 md:py-2',
  menuList: 'flex flex-col gap-0.5',
  // 서랍에서는 48px, 데스크톱에서는 44px.
  menuLink: `group flex h-12 cursor-pointer items-center gap-3 rounded-xl px-3 text-[15px] transition md:h-11 ${FOCUS_CLASS_NAME}`,
  menuLinkActive: 'bg-[var(--surface)] font-bold text-[var(--foreground)] shadow-(--shadow-xs)',
  menuLinkInactive:
    'font-semibold text-[var(--muted)] hover:bg-[var(--surface)]/60 hover:text-[var(--foreground)] active:bg-[var(--line)]/50',
  menuIconActive: 'size-5 shrink-0 text-[var(--brand)]',
  menuIconInactive:
    'size-5 shrink-0 text-[var(--muted)]/70 transition group-hover:text-[var(--muted)]',
};

// 백오피스 공통 레이아웃.
// 맨 위 헤더가 전체 너비로 깔리고, 그 아래에 사이드 메뉴와 본문이 놓인다.
// 좁은 화면에서는 헤더 오른쪽 햄버거 버튼으로 메뉴를 오른쪽에서 꺼내고, 로그아웃도 메뉴 안에 둔다.
export function AdminShell({
  service,
  adminName,
  menuItems,
  isLoggingOut,
  onLogout,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const drawerId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 메뉴가 열려 있는 동안: Esc로 닫기, 본문 스크롤 잠금, 닫기 버튼으로 포커스 이동.
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const openButton = openButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      openButton?.focus();
    };
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen">
      <header className={ui.header}>
        {/* 서비스 이름이 로고 자리. 현재 위치(서비스 > 메뉴)는 고른 메뉴와 본문 제목이 대신 알려 준다. */}
        <Link
          className={`cursor-pointer rounded-lg text-lg font-extrabold tracking-[-0.02em] text-[var(--brand)] transition hover:text-[var(--brand-hover)] md:text-[19px] ${FOCUS_CLASS_NAME}`}
          href={`/${service}`}
        >
          {ADMIN_SERVICE_LABELS[service]}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {/* 넓은 화면: 화면 모드, 관리자 이름, 로그아웃을 헤더에 둔다. */}
          <div className="hidden items-center gap-3 md:flex">
            <ThemeMenu />
            <span className="max-w-48 truncate text-[13px] font-semibold text-[var(--muted)]">
              {adminName}
            </span>
            <button
              className={SMALL_BUTTON_CLASS_NAME}
              disabled={isLoggingOut}
              onClick={onLogout}
              type="button"
            >
              <Icon className={ui.logoutIcon} name="logout" />
              로그아웃
            </button>
          </div>

          {/* 좁은 화면: 오른쪽 햄버거 버튼으로 메뉴(로그아웃 포함)를 연다. */}
          <button
            aria-controls={drawerId}
            aria-expanded={isMenuOpen}
            aria-label="메뉴 열기"
            className={ui.openButton}
            onClick={() => setIsMenuOpen(true)}
            ref={openButtonRef}
            type="button"
          >
            <Icon className={ui.drawerIcon} name="menu" />
          </button>
        </div>
      </header>

      <div className="md:flex">
        {isMenuOpen ? (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-[var(--backdrop)] md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        ) : null}

        <aside
          className={`${ui.aside} ${isMenuOpen ? 'visible translate-x-0' : 'invisible translate-x-full'}`}
          id={drawerId}
        >
          <div className={ui.drawerHead}>
            <span className={ui.drawerBrand}>{ADMIN_SERVICE_LABELS[service]}</span>
            <button
              aria-label="메뉴 닫기"
              className={ui.closeButton}
              onClick={() => setIsMenuOpen(false)}
              ref={closeButtonRef}
              type="button"
            >
              <Icon className={ui.drawerIcon} name="x" />
            </button>
          </div>

          <nav aria-label="메인 메뉴" className={ui.nav}>
            <ul className={ui.menuList}>
              {menuItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className={`${ui.menuLink} ${isActive ? ui.menuLinkActive : ui.menuLinkInactive}`}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon
                        className={isActive ? ui.menuIconActive : ui.menuIconInactive}
                        name={item.icon}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 좁은 화면 전용: 메뉴 맨 아래에 관리자 이름과 로그아웃, 그 아래 화면 모드. */}
          <div className="m-3 grid gap-2.5 rounded-[18px] bg-[var(--surface)] py-3 pr-3 pl-4 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold">{adminName}</span>
              <button
                className={SMALL_BUTTON_CLASS_NAME}
                disabled={isLoggingOut}
                onClick={onLogout}
                type="button"
              >
                <Icon className={ui.logoutIcon} name="logout" />
                로그아웃
              </button>
            </div>
            <ThemeSegment />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
