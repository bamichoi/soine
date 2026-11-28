import { Icon } from '@/components/icon';

type SortOrder = 'asc' | 'desc';

const SORT_ICONS = { asc: 'arrow-up', desc: 'arrow-down' } as const;
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

type SortableHeaderProps = {
  label: string;
  /** 이 열로 정렬 중이면 방향, 아니면 null */
  order: SortOrder | null;
  onSort: () => void;
  className?: string;
  align?: 'right';
};

// 누르면 정렬하는 표 머리글. 정렬 중인 열은 화살표로 방향을 보여 준다.
export function SortableHeader({
  label,
  order,
  onSort,
  className = '',
  align,
}: SortableHeaderProps) {
  return (
    <th
      aria-sort={order ? ARIA_SORT[order] : undefined}
      className={`px-4 py-3 font-medium whitespace-nowrap ${align === 'right' ? 'text-right' : ''} ${className}`}
      scope="col"
    >
      <button
        className={`inline-flex items-center gap-1 hover:text-[var(--foreground)] ${align === 'right' ? 'flex-row-reverse' : ''}`}
        onClick={onSort}
        type="button"
      >
        {label}
        <Icon
          className={`size-3.5 ${order ? 'text-[var(--brand)]' : 'opacity-50'}`}
          name={order ? SORT_ICONS[order] : 'chevrons-up-down'}
        />
      </button>
    </th>
  );
}
