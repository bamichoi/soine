'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme-script';

// 화면 모드 (docs/design/backoffice-theme.md 2절).
// 시스템은 저장 키를 지우고 <html data-theme>도 지워 CSS 미디어 쿼리에 맡긴다.
// 두 서비스·로그인 화면이 한 값을 같이 쓴다.

export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_OPTIONS: {
  value: ThemeChoice;
  label: string;
  icon: 'sun' | 'moon' | 'monitor';
}[] = [
  { icon: 'sun', label: '라이트', value: 'light' },
  { icon: 'moon', label: '다크', value: 'dark' },
  { icon: 'monitor', label: '시스템', value: 'system' },
];

function toChoice(value: string | null | undefined): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function readStored(): ThemeChoice {
  try {
    return toChoice(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // 저장소를 못 쓰면 지금 화면에 걸린 값을 따른다.
    return toChoice(document.documentElement.dataset.theme);
  }
}

function applyToDocument(choice: ThemeChoice) {
  if (choice === 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = choice;
  }
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// 다른 탭에서 바꾼 값도 같은 처리로 반영한다.
function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
    return;
  }

  applyToDocument(readStored());
  notify();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener('storage', handleStorage);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

/** 서버 렌더와 첫 하이드레이션은 '시스템'으로 그리고, 그 뒤 저장된 값으로 맞춘다. */
function getServerSnapshot(): ThemeChoice {
  return 'system';
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // 저장하지 못해도 지금 화면에는 적용한다.
  }

  applyToDocument(choice);
  notify();
}

/** 지금 고른 화면 모드와 바꾸는 함수 */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const theme = useSyncExternalStore(subscribe, readStored, getServerSnapshot);
  const change = useCallback((choice: ThemeChoice) => setTheme(choice), []);

  return [theme, change];
}
