import type { ReactNode } from 'react';

type PageTitleBarProps = {
  title: ReactNode;
  /** 오른쪽에 둘 버튼 등 */
  actions?: ReactNode;
};

// 본문 맨 위 한 줄: 왼쪽에 화면 제목, 오른쪽에 버튼.
export function PageTitleBar({ title, actions }: PageTitleBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
