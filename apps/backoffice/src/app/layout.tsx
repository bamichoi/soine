import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { THEME_INIT_SCRIPT } from '@/lib/theme-script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Backoffice',
  description: '초이돌상·굿플레이스 운영 관리 시스템',
};

// 화면 모드 (docs/design/backoffice-theme.md 2절). 기본 select·날짜 달력·스크롤바가 모드를 따른다.
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { color: '#f4f6f9', media: '(prefers-color-scheme: light)' },
    { color: '#1d2025', media: '(prefers-color-scheme: dark)' },
  ],
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // 첫 그림 전 스크립트가 data-theme을 붙이므로 서버 HTML과 달라도 경고하지 않는다.
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: 고정 문자열(THEME_INIT_SCRIPT)만 넣는다. 첫 그림 전에 화면 모드를 걸어 깜빡임을 막는다.
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
