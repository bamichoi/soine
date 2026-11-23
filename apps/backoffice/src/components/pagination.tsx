type PaginationProps = {
  /** 보조기기에 읽히는 이름 (예: "문의 기록 페이지") */
  label: string;
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
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

// 표 아래에 두는 공통 페이지 이동. 한 페이지뿐이어도 보여서 현재 위치를 알 수 있다.
export function Pagination({ label, page, totalPages, onChange }: PaginationProps) {
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
