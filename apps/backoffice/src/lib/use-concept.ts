'use client';

import { useEffect, useState } from 'react';
import { AdminApiError } from '@/lib/admin-auth-api';
import { type Concept, getConcept } from '@/lib/choidolsang-concepts-api';

export type ConceptLoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; concept: Concept };

/** 돌상 컨셉을 불러온다. 상세와 수정 화면이 함께 쓴다. */
export function useConcept(id: string) {
  const [state, setState] = useState<ConceptLoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    getConcept(id)
      .then((concept) => {
        if (isActive) {
          setState({ concept, kind: 'loaded' });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState(
            error instanceof AdminApiError && error.status === 404
              ? { kind: 'not-found' }
              : { kind: 'error' },
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  return state;
}
