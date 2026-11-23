'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { ADMIN_SERVICE_LABELS, type AdminService } from '@/lib/admin-auth-api';
import type { AdminMenuItem } from '@/lib/admin-menu';

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

const ICON_BUTTON_CLASS_NAME =
  'flex size-9 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]';

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
  const currentMenuItem = menuItems.find((item) => isActivePath(pathname, item.href));

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
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-1 pl-2 md:pl-0">
          <nav aria-label="현재 위치" className="min-w-0">
            <ol className="flex items-center gap-1.5">
              <li className="shrink-0">
                <Link className="text-lg font-semibold text-[var(--brand)]" href={`/${service}`}>
                  {ADMIN_SERVICE_LABELS[service]}
                </Link>
              </li>
              {currentMenuItem ? (
                <li className="flex min-w-0 items-center gap-1.5">
                  <Icon className="size-4 shrink-0 text-[var(--muted)]" name="chevron-right" />
                  <span aria-current="page" className="truncate text-sm font-medium">
                    {currentMenuItem.label}
                  </span>
                </li>
              ) : null}
            </ol>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 넓은 화면: 관리자 이름과 로그아웃을 헤더에 둔다. */}
          <span className="hidden max-w-48 truncate text-sm text-[var(--muted)] md:inline">
            {adminName}
          </span>
          <button
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-60 md:flex"
            disabled={isLoggingOut}
            onClick={onLogout}
            type="button"
          >
            <Icon className="size-4" name="logout" />
            로그아웃
          </button>
          {/* 좁은 화면: 오른쪽 햄버거 버튼으로 메뉴(로그아웃 포함)를 연다. */}
          <button
            aria-controls={drawerId}
            aria-expanded={isMenuOpen}
            aria-label="메뉴 열기"
            className={`${ICON_BUTTON_CLASS_NAME} md:hidden`}
            onClick={() => setIsMenuOpen(true)}
            ref={openButtonRef}
            type="button"
          >
            <Icon name="menu" />
          </button>
        </div>
      </header>

      <div className="md:flex">
        {isMenuOpen ? (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-72 max-w-[85vw] flex-col bg-[var(--surface)] shadow-xl transition-[translate,visibility] duration-200 md:visible md:sticky md:top-14 md:right-auto md:bottom-auto md:z-auto md:h-[calc(100vh-3.5rem)] md:w-60 md:max-w-none md:shrink-0 md:translate-x-0 md:border-r md:border-[var(--line)] md:shadow-none md:transition-none ${
            isMenuOpen ? 'visible translate-x-0' : 'invisible translate-x-full'
          }`}
          id={drawerId}
        >
          <div className="flex h-14 items-center justify-between border-b border-[var(--line)] px-4 md:hidden">
            <span className="text-lg font-semibold text-[var(--brand)]">
              {ADMIN_SERVICE_LABELS[service]}
            </span>
            <button
              aria-label="메뉴 닫기"
              className={ICON_BUTTON_CLASS_NAME}
              onClick={() => setIsMenuOpen(false)}
              ref={closeButtonRef}
              type="button"
            >
              <Icon name="x" />
            </button>
          </div>

          <nav aria-label="메인 메뉴" className="flex-1 overflow-y-auto px-3 py-3">
            <ul className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition md:py-2 ${
                        isActive
                          ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                          : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                      }`}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 좁은 화면 전용: 메뉴 맨 아래에 관리자 이름과 로그아웃. */}
          <div className="border-t border-[var(--line)] px-3 py-3 md:hidden">
            <p className="truncate px-3 pb-2 text-sm text-[var(--muted)]">{adminName}</p>
            <button
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-60"
              disabled={isLoggingOut}
              onClick={onLogout}
              type="button"
            >
              <Icon name="logout" />
              로그아웃
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
