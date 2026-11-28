import { Icon } from '@/components/icon';

type PaginationProps = {
  /** 보조기기에 읽히는 이름 (예: "문의 기록 페이지") */
  label: string;
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** 'kkiru'면 끼루 모양(둥근 숫자, 아이콘 화살표). 기본은 지금 모양 그대로 */
  look?: 'default' | 'kkiru';
};

const PAGE_WINDOW = 5;

const BUTTON_CLASS_NAME =
  'flex h-9 min-w-9 items-center justify-center border border-[var(--line)] bg-[var(--surface)] px-3 text-sm tabular-nums hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:text-[var(--muted)] disabled:opacity-60 disabled:hover:bg-[var(--surface)]';

/** 현재 페이지를 가운데 두고 최대 5개의 페이지 번호를 보여 준다. */
function getPageNumbers(page: number, totalPages: number): number[] {
  const start = Math.max(
    1,
    Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW + 1),
  );
  const end = Math.min(totalPages, start + PAGE_WINDOW - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

const KKIRU_FOCUS_CLASS_NAME =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';
const KKIRU_BUTTON_CLASS_NAME = `grid h-9 min-w-9 cursor-pointer place-items-center rounded-[10px] px-2 text-sm font-semibold text-[var(--muted)] tabular-nums hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${KKIRU_FOCUS_CLASS_NAME}`;

/** 끼루 모양 (docs/design/kkiru-style-guide.md '페이지 이동') */
function KkiruPagination({ label, page, totalPages, onChange }: PaginationProps) {
  const lastPage = Math.max(1, totalPages);

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-1">
      <button
        aria-label="이전 페이지"
        className={KKIRU_BUTTON_CLASS_NAME}
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
            className={KKIRU_BUTTON_CLASS_NAME}
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
        className={KKIRU_BUTTON_CLASS_NAME}
        disabled={page >= lastPage}
        onClick={() => onChange(page + 1)}
        type="button"
      >
        <Icon className="size-4" name="chevron-right" />
      </button>
    </nav>
  );
}

// 표 아래에 두는 공통 페이지 이동. 한 페이지뿐이어도 보여서 현재 위치를 알 수 있다.
export function Pagination({ look = 'default', ...props }: PaginationProps) {
  if (look === 'kkiru') {
    return <KkiruPagination {...props} />;
  }

  const { label, page, totalPages, onChange } = props;
  const lastPage = Math.max(1, totalPages);

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-1.5">
      <button
        className={BUTTON_CLASS_NAME}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        type="button"
      >
        이전
      </button>
      {getPageNumbers(page, lastPage).map((pageNumber) =>
        pageNumber === page ? (
          <span
            aria-current="page"
            className="flex h-9 min-w-9 items-center justify-center border border-[var(--brand)] bg-[var(--brand)] px-3 text-sm text-white tabular-nums"
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
        className={BUTTON_CLASS_NAME}
        disabled={page >= lastPage}
        onClick={() => onChange(page + 1)}
        type="button"
      >
        다음
      </button>
    </nav>
  );
}
