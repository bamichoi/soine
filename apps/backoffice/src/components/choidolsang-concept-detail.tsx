'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ConceptLoadMessage } from '@/components/choidolsang-concept-form';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { deleteConcept, formatPrice } from '@/lib/choidolsang-concepts-api';
import { useConcept } from '@/lib/use-concept';

const LIST_PATH = '/choidolsang/concepts';

const SECONDARY_BUTTON_CLASS_NAME =
  'flex h-10 items-center border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium hover:bg-[var(--background)]';

export function ChoidolsangConceptDetail({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const querySuffix = listQuery ? `?${listQuery}` : '';
  const state = useConcept(id);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (state.kind !== 'loaded') {
    return <ConceptLoadMessage state={state} />;
  }

  const { concept } = state;

  return (
    <article className="flex flex-col border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold break-words">{concept.name}</h3>
          <p className="text-lg font-semibold tabular-nums">{formatPrice(concept.price)}</p>
        </header>

        <section
          aria-label="구성품"
          className="flex flex-col gap-2 bg-[var(--background)] px-5 py-4"
        >
          <h4 className="text-xs text-[var(--muted)]">구성품</h4>
          {concept.components.length > 0 ? (
            <ul className="flex flex-col gap-1 text-[15px] leading-7">
              {concept.components.map((component, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 읽기 전용 목록이라 순서가 바뀌지 않고, 같은 이름이 있을 수 있다.
                <li className="flex gap-2 break-words" key={`${index}-${component}`}>
                  <span aria-hidden="true" className="text-[var(--muted)]">
                    ·
                  </span>
                  {component}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">적힌 구성품이 없습니다.</p>
          )}
        </section>
      </div>

      <footer className="flex gap-2 border-t border-[var(--line)] px-6 py-4">
        <Link
          className={SECONDARY_BUTTON_CLASS_NAME}
          href={`${LIST_PATH}/${concept.id}/edit${querySuffix}`}
        >
          수정
        </Link>
        <button
          className={SECONDARY_BUTTON_CLASS_NAME}
          onClick={() => setIsDeleteOpen(true)}
          type="button"
        >
          삭제
        </button>
      </footer>

      <DeleteConfirmDialog
        isOpen={isDeleteOpen}
        message={`돌상 컨셉 "${concept.name}"을(를) 삭제할까요? 삭제한 컨셉은 목록에서 보이지 않습니다.`}
        notFoundMessage="이미 삭제된 돌상 컨셉입니다. 목록으로 돌아가 주세요."
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={async () => {
          await deleteConcept(concept.id);
          router.push(`${LIST_PATH}${querySuffix}`);
        }}
        title="돌상 컨셉 삭제"
      />
    </article>
  );
}
