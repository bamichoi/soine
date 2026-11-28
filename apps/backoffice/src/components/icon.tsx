import type { CSSProperties } from 'react';

// 아이콘 원본은 public/icons/<name>.svg 에 둔다. 코드에 SVG를 직접 넣지 않는다.
// 파일을 마스크로 써서 글자색(currentColor)을 따라가므로 hover 색 변경 등이 그대로 적용된다.
// 새 아이콘은 파일을 추가하고 아래 목록에 이름을 등록한다.
const ICON_NAMES = [
  'arrow-down',
  'arrow-left',
  'arrow-up',
  'calendar',
  'chart-bar',
  'check',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'chevrons-up-down',
  'clipboard-check',
  'copy',
  'eye',
  'eye-off',
  'file-text',
  'handshake',
  'home',
  'logout',
  'megaphone',
  'menu',
  'message',
  'more-vertical',
  'phone',
  'plus',
  'search',
  'sparkles',
  'users',
  'wallet',
  'x',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

type IconProps = {
  name: IconName;
  className?: string;
};

export function Icon({ name, className = 'size-5' }: IconProps) {
  const style: CSSProperties = {
    maskImage: `url(/icons/${name}.svg)`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
  };

  return (
    <span aria-hidden="true" className={`inline-block bg-current ${className}`} style={style} />
  );
}
