'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DataLoader } from '@/components/data-loader';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { InfoGroup, InfoItem, InfoSheet, InfoTextGroup } from '@/components/detail-parts';
import { PageHead } from '@/components/page-parts';
import {
  type Concept,
  deleteConcept,
  formatPrice,
  getConcept,
} from '@/lib/choidolsang-concepts-api';
import { DANGER_BUTTON_CLASS_NAME, SECONDARY_BUTTON_CLASS_NAME } from '@/lib/ui';

const LIST_PATH = '/choidolsang/concepts';

/** 구성품은 한 줄에 하나씩 */
function toComponentLines(components: string[]): string | null {
  return components.length > 0 ? components.map((component) => `· ${component}`).join('\n') : null;
}

function ConceptBody({ concept }: { concept: Concept }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const querySuffix = listQuery ? `?${listQuery}` : '';
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <article>
      {/* 컨셉은 번호가 없어 제목 위 줄 없이 이름만 둔다. 버튼은 보조 → 위험 순서. */}
      <PageHead
        controlsClassName="flex w-full flex-wrap items-center gap-2 sm:w-auto"
        title={<span className="break-words">{concept.name}</span>}
      >
        <Link
          className={SECONDARY_BUTTON_CLASS_NAME}
          href={`${LIST_PATH}/${concept.id}/edit${querySuffix}`}
        >
          수정
        </Link>
        <button
          className={DANGER_BUTTON_CLASS_NAME}
          onClick={() => setIsDeleteOpen(true)}
          type="button"
        >
          삭제
        </button>
      </PageHead>

      <InfoSheet label="돌상 컨셉 정보">
        <InfoGroup title="가격">
          <InfoItem isMoney label="가격">
            {formatPrice(concept.price)}
          </InfoItem>
          <InfoItem label="구성품 수">
            <span className="tabular-nums">{concept.components.length}개</span>
          </InfoItem>
        </InfoGroup>
        <InfoTextGroup text={toComponentLines(concept.components)} title="구성품" />
      </InfoSheet>

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

export function ChoidolsangConceptDetail({ id }: { id: string }) {
  return (
    <DataLoader load={getConcept} loadKey={id} noun="돌상 컨셉">
      {(concept) => <ConceptBody concept={concept} />}
    </DataLoader>
  );
}
