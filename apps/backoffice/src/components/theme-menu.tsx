'use client';

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { THEME_OPTIONS, type ThemeChoice, useTheme } from '@/lib/theme';
import { FOCUS_CLASS_NAME } from '@/lib/ui';

// 화면 모드 버튼과 메뉴 (docs/design/backoffice-theme.md 3절, 시안 docs/design/backoffice-dark.html (d)).
// 데스크톱 헤더·로그인 화면은 아이콘 버튼 + 메뉴, 모바일 서랍은 3칸 세그먼트(ThemeSegment).

const THEME_LABELS: Record<ThemeChoice, string> = {
  dark: '다크',
  light: '라이트',
  system: '시스템',
};

const THEME_ICONS = {
  dark: 'moon',
  light: 'sun',
  system: 'monitor',
} as const;

// 회색 바탕(헤더·로그인) 위 버튼이라 호버·열림 바탕은 surface.
const BUTTON_CLASS_NAME = `grid shrink-0 cursor-pointer place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] active:bg-[var(--line)]/70 aria-expanded:bg-[var(--surface)] aria-expanded:text-[var(--foreground)] ${FOCUS_CLASS_NAME}`;

const ITEM_CLASS_NAME =
  'flex h-9 w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 text-sm font-semibold outline-none hover:bg-[var(--background)] hover:text-[var(--foreground)] focus-visible:bg-[var(--background)] focus-visible:text-[var(--foreground)]';

type ThemeMenuProps = {
  /** 헤더는 32px(sm), 로그인 화면은 36px(md) */
  size?: 'sm' | 'md';
};

export function ThemeMenu({ size = 'sm' }: ThemeMenuProps) {
  const [theme, setTheme] = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusItem(index: number) {
    const count = THEME_OPTIONS.length;
    itemRefs.current[(index + count) % count]?.focus();
  }

  // 열 때 고른 항목에 포커스를 둔다(버튼 Enter·Space·↓).
  function open() {
    setIsOpen(true);
    requestAnimationFrame(() =>
      focusItem(THEME_OPTIONS.findIndex((option) => option.value === theme)),
    );
  }

  // 열려 있는 동안 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  function close(returnFocus: boolean) {
    setIsOpen(false);

    if (returnFocus) {
      buttonRef.current?.focus();
    }
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' && !isOpen) {
      event.preventDefault();
      open();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(THEME_OPTIONS.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
    }
  }

  function choose(choice: ThemeChoice) {
    setTheme(choice);
    close(true);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="화면 모드"
        className={`${BUTTON_CLASS_NAME} ${size === 'md' ? 'size-9' : 'size-8'}`}
        onClick={() => (isOpen ? close(false) : open())}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
        title={`화면 모드: ${THEME_LABELS[theme]}`}
        type="button"
      >
        <Icon className="size-[18px]" name={THEME_ICONS[theme]} />
      </button>

      {isOpen ? (
        <div
          aria-label="화면 모드"
          className="absolute top-full right-0 z-30 mt-1.5 w-37 rounded-xl bg-[var(--surface)] p-1 shadow-(--shadow-pop)"
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          role="menu"
        >
          {THEME_OPTIONS.map((option, index) => {
            const isChecked = option.value === theme;

            return (
              <button
                aria-checked={isChecked}
                className={`${ITEM_CLASS_NAME} ${isChecked ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}
                key={option.value}
                onClick={() => choose(option.value)}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                role="menuitemradio"
                tabIndex={-1}
                type="button"
              >
                <Icon className="size-4 shrink-0" name={option.icon} />
                {option.label}
                {isChecked ? (
                  <Icon className="ml-auto size-4 shrink-0 text-[var(--brand)]" name="check" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** 모바일 서랍 아래 카드의 3칸 세그먼트. 누르면 바로 적용하고 서랍은 열어 둔다. */
export function ThemeSegment() {
  const [theme, setTheme] = useTheme();

  return (
    <fieldset
      aria-label="화면 모드"
      className="m-0 grid grid-cols-3 rounded-[14px] border-0 bg-[var(--background)] p-1"
    >
      {THEME_OPTIONS.map((option) => {
        const isPressed = option.value === theme;

        return (
          <button
            aria-pressed={isPressed}
            className={`flex h-8 cursor-pointer items-center justify-center gap-1 rounded-[10px] text-[13px] font-bold transition ${
              isPressed
                ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-(--shadow-xs)'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            } ${FOCUS_CLASS_NAME}`}
            key={option.value}
            onClick={() => setTheme(option.value)}
            type="button"
          >
            <Icon className="size-3.5 shrink-0" name={option.icon} />
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
