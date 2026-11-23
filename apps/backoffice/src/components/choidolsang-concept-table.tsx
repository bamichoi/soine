'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import { Pagination } from '@/components/pagination';
import {
  type ConceptListQuery,
  type ConceptListResponse,
  formatPrice,
  listConcepts,
  parseConceptListQuery,
  toConceptListSearchParams,
} from '@/lib/choidolsang-concepts-api';

const LIST_PATH = '/choidolsang/concepts';

const EMPTY_VALUE = <span className="text-[var(--muted)]">-</span>;

const CONTROL_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)]';
const BUTTON_CLASS_NAME =
  'h-10 border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: ConceptListResponse };

export function ChoidolsangConceptTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(
    () => parseConceptListQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const queryKey = toConceptListSearchParams(query).toString();
  const [searchText, setSearchText] = useState(query.q);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  // 뒤로 가기 등으로 URL이 바뀌면 검색창도 맞춘다.
  useEffect(() => {
    setSearchText(query.q);
  }, [query.q]);

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    // reloadKey는 '다시 시도'로 같은 조건을 다시 불러오기 위한 값이다.
    void reloadKey;
    listConcepts(parseConceptListQuery(new URLSearchParams(queryKey)))
      .then((data) => {
        if (isActive) {
          setState({ data, kind: 'loaded' });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, [queryKey, reloadKey]);

  // 목록 조건은 URL에 남겨 상세에서 돌아와도 그대로 보이게 한다.
  function updateQuery(changes: Partial<ConceptListQuery>) {
    const params = toConceptListSearchParams({ ...query, ...changes }).toString();
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ page: 1, q: searchText.trim() });
  }

  const pagination = state.kind === 'loaded' ? state.data.pagination : null;
  const detailQuery = queryKey ? `?${queryKey}` : '';

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">돌상 컨셉</h2>
          {pagination ? (
            <p className="text-sm text-[var(--muted)]">{pagination.total.toLocaleString()}개</p>
          ) : null}
        </div>
        <Link
          className="flex h-10 items-center gap-1.5 bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
          href={`${LIST_PATH}/new${detailQuery}`}
        >
          <Icon className="size-4" name="plus" />
          컨셉 추가
        </Link>
      </div>

      <form
        aria-label="돌상 컨셉 검색"
        className="flex flex-wrap items-center gap-2"
        onSubmit={handleSearch}
      >
        <input
          aria-label="컨셉 이름"
          className={`${CONTROL_CLASS_NAME} min-w-0 flex-1 sm:max-w-80`}
          maxLength={100}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="컨셉 이름으로 검색"
          type="search"
          value={searchText}
        />
        <button className={BUTTON_CLASS_NAME} type="submit">
          검색
        </button>
        {query.q ? (
          <button
            className="h-10 px-2 text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            onClick={() => updateQuery({ page: 1, q: '' })}
            type="button"
          >
            검색 초기화
          </button>
        ) : null}
      </form>

      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[40rem] table-fixed text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="w-56 px-4 py-3 font-medium" scope="col">
                이름
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                구성품
              </th>
              <th className="w-36 px-4 py-3 text-right font-medium" scope="col">
                가격
              </th>
            </tr>
          </thead>
          <tbody>
            {state.kind === 'loaded'
              ? state.data.items.map((concept) => (
                  // 행 전체를 누르면 상세로 간다. 이름 링크를 행 크기로 늘려 링크 동작을 그대로 쓴다.
                  <tr
                    className="relative cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--background)] has-[a:focus-visible]:bg-[var(--brand-soft)]"
                    key={concept.id}
                  >
                    <td className="px-4 py-3">
                      <Link
                        className="block truncate outline-none after:absolute after:inset-0"
                        href={`${LIST_PATH}/${concept.id}${detailQuery}`}
                        title={concept.name}
                      >
                        {concept.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {concept.components.length > 0 ? (
                        <p className="truncate" title={concept.components.join(', ')}>
                          {concept.components.join(', ')}
                        </p>
                      ) : (
                        EMPTY_VALUE
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatPrice(concept.price)}
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        {state.kind === 'loading' ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            돌상 컨셉을 불러오고 있습니다.
          </p>
        ) : null}
        {state.kind === 'error' ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10" role="alert">
            <p className="text-sm text-[var(--error)]">돌상 컨셉을 불러오지 못했습니다.</p>
            <button
              className={BUTTON_CLASS_NAME}
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : null}
        {state.kind === 'loaded' && state.data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            {query.q ? '검색 결과가 없습니다.' : '아직 등록된 돌상 컨셉이 없습니다.'}
          </p>
        ) : null}
      </div>

      {pagination ? (
        <Pagination
          label="돌상 컨셉 페이지"
          onChange={(page) => updateQuery({ page })}
          page={pagination.page}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  );
}
