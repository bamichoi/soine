import { Icon } from '@/components/icon';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/lib/list-query';
import { FOCUS_CLASS_NAME } from '@/lib/ui';

type PaginationProps = {
  /** 보조기기에 읽히는 이름 (예: "문의 기록 페이지") */
  label: string;
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** 한 페이지 개수. onPageSizeChange와 함께 주면 오른쪽 끝에 개수 셀렉트를 둔다. */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  /** 전체 건수. 10건 이하이고 개수가 기본값이면 셀렉트를 숨긴다(바꿔도 같은 화면). */
  total?: number;
};

const PAGE_WINDOW = 5;

const SIZE_SELECT_CLASS_NAME = `h-9 cursor-pointer appearance-none rounded-[10px] bg-[var(--surface)] pr-8 pl-3 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] hover:shadow-[inset_0_0_0_1px_var(--line)] ${FOCUS_CLASS_NAME}`;

const BUTTON_CLASS_NAME = `grid h-9 min-w-9 cursor-pointer place-items-center rounded-[10px] px-2 text-sm font-semibold text-[var(--muted)] tabular-nums hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_CLASS_NAME}`;

/** 현재 페이지를 가운데 두고 최대 5개의 페이지 번호를 보여 준다. */
function getPageNumbers(page: number, totalPages: number): number[] {
  const start = Math.max(
    1,
    Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW + 1),
  );
  const end = Math.min(totalPages, start + PAGE_WINDOW - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

// 표 아래에 두는 공통 페이지 이동 (docs/design/goodplace-style-guide.md '페이지 이동'·7절 '표 개수').
// 한 페이지뿐이어도 보여서 현재 위치를 알 수 있다.
// 데스크톱은 번호를 가운데, 개수 셀렉트를 오른쪽 끝에 두고, 좁은 화면은 번호 줄 아래에 셀렉트를 둔다.
export function Pagination({
  label,
  page,
  totalPages,
  onChange,
  pageSize,
  onPageSizeChange,
  total,
}: PaginationProps) {
  const lastPage = Math.max(1, totalPages);
  const showSize =
    pageSize !== undefined &&
    onPageSizeChange !== undefined &&
    !(total !== undefined && total <= PAGE_SIZE_OPTIONS[0] && pageSize === DEFAULT_PAGE_SIZE);

  return (
    <div className="flex flex-col items-center gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
      <nav aria-label={label} className="flex items-center justify-center gap-1 sm:col-start-2">
        <button
          aria-label="이전 페이지"
          className={BUTTON_CLASS_NAME}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          type="button"
        >
          <Icon className="size-4" name="chevron-left" />
        </button>
        {getPageNumbers(page, lastPage).map((pageNumber) =>
          pageNumber === page ? (
            <span
              aria-current="page"
              className="grid h-9 min-w-9 place-items-center rounded-[10px] bg-[var(--foreground)] px-2 text-sm font-semibold text-[var(--surface)] tabular-nums"
              key={pageNumber}
            >
              {pageNumber}
            </span>
          ) : (
            <button
              aria-label={`${pageNumber}페이지`}
              className={BUTTON_CLASS_NAME}
              key={pageNumber}
              onClick={() => onChange(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ),
        )}
        <button
          aria-label="다음 페이지"
          className={BUTTON_CLASS_NAME}
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
          type="button"
        >
          <Icon className="size-4" name="chevron-right" />
        </button>
      </nav>
      {showSize ? (
        <div className="relative sm:col-start-3 sm:justify-self-end">
          <select
            aria-label="한 페이지에 보일 개수"
            className={SIZE_SELECT_CLASS_NAME}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
            value={pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}개씩
              </option>
            ))}
          </select>
          <Icon
            className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-[var(--muted)]"
            name="chevron-down"
          />
        </div>
      ) : null}
    </div>
  );
}
