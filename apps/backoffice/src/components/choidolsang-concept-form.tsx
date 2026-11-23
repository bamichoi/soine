'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useState } from 'react';
import { Icon } from '@/components/icon';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  CONCEPT_COMPONENT_MAX_LENGTH,
  CONCEPT_COMPONENTS_MAX_COUNT,
  CONCEPT_NAME_MAX_LENGTH,
  CONCEPT_PRICE_MAX,
  type Concept,
  type ConceptInput,
  createConcept,
  updateConcept,
} from '@/lib/choidolsang-concepts-api';
import { type ConceptLoadState, useConcept } from '@/lib/use-concept';

const LIST_PATH = '/choidolsang/concepts';

const CONTROL_CLASS_NAME =
  'w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60';

function Field({
  label,
  htmlFor,
  required = false,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <label className="pt-2 text-sm font-medium" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[var(--error)]">
            *
          </span>
        ) : null}
      </label>
      <div className="flex min-w-0 flex-col gap-1.5">
        {children}
        {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

// 가격 칸은 숫자만 받고 천 단위 쉼표를 붙여 보여 준다.
function toPriceText(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits ? Number(digits).toLocaleString('ko-KR') : '';
}

function buildInput(name: string, components: string[], priceText: string): ConceptInput | string {
  if (!name.trim()) {
    return '컨셉 이름을 입력해 주세요.';
  }

  const price = Number(priceText.replace(/\D/g, ''));

  if (!priceText || !Number.isInteger(price)) {
    return '가격을 입력해 주세요.';
  }

  if (price > CONCEPT_PRICE_MAX) {
    return `가격은 ${CONCEPT_PRICE_MAX.toLocaleString('ko-KR')}원 이하로 입력해 주세요.`;
  }

  return { components, name: name.trim(), price };
}

/** 화면에서만 쓰는 구성품 항목. 같은 이름이 있어도 구분하도록 key를 붙인다. */
type ComponentItem = { key: number; value: string };

let nextComponentKey = 0;

function toComponentItems(components: string[]): ComponentItem[] {
  return components.map((value) => ({ key: nextComponentKey++, value }));
}

type ComponentListInputProps = {
  inputId: string;
  components: ComponentItem[];
  onChange: (components: ComponentItem[]) => void;
};

// 구성품을 하나씩 적고 + 로 목록에 더한다. 더한 항목은 x 로 뺀다.
function ComponentListInput({ inputId, components, onChange }: ComponentListInputProps) {
  const [draft, setDraft] = useState('');
  const isFull = components.length >= CONCEPT_COMPONENTS_MAX_COUNT;

  function addDraft() {
    const item = draft.trim();

    if (!item || isFull) {
      return;
    }

    onChange([...components, { key: nextComponentKey++, value: item }]);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중 Enter는 글자 확정이므로 무시한다.
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      addDraft();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className={`${CONTROL_CLASS_NAME} h-10`}
          disabled={isFull}
          id={inputId}
          maxLength={CONCEPT_COMPONENT_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예: 상차림 테이블"
          value={draft}
        />
        <button
          className="flex h-10 shrink-0 items-center gap-1 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!draft.trim() || isFull}
          onClick={addDraft}
          type="button"
        >
          <Icon className="size-4" name="plus" />
          추가
        </button>
      </div>
      {components.length > 0 ? (
        <ul aria-label="추가한 구성품" className="flex flex-col">
          {components.map((component) => (
            <li
              className="flex items-center justify-between gap-2 border-b border-[var(--line)] py-2 text-sm last:border-b-0"
              key={component.key}
            >
              <span className="min-w-0 break-words">{component.value}</span>
              <button
                aria-label={`${component.value} 빼기`}
                className="flex size-7 shrink-0 items-center justify-center text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                onClick={() => onChange(components.filter((item) => item.key !== component.key))}
                type="button"
              >
                <Icon className="size-4" name="x" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type ChoidolsangConceptFormProps = {
  /** 있으면 수정 폼 */
  concept?: Concept;
};

export function ChoidolsangConceptForm({ concept }: ChoidolsangConceptFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = searchParams.toString();
  const querySuffix = listQuery ? `?${listQuery}` : '';
  const cancelHref = concept
    ? `${LIST_PATH}/${concept.id}${querySuffix}`
    : `${LIST_PATH}${querySuffix}`;
  const idPrefix = useId();
  const [name, setName] = useState(concept?.name ?? '');
  const [components, setComponents] = useState(() => toComponentItems(concept?.components ?? []));
  const [priceText, setPriceText] = useState(concept ? toPriceText(String(concept.price)) : '');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = (field: string) => `${idPrefix}-${field}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildInput(
      name,
      components.map((item) => item.value),
      priceText,
    );

    if (typeof result === 'string') {
      setErrorMessage(result);
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const saved = concept ? await updateConcept(concept.id, result) : await createConcept(result);
      router.push(`${LIST_PATH}/${saved.id}${querySuffix}`);
    } catch (error) {
      setErrorMessage(
        error instanceof AdminApiError && error.status === 404
          ? '삭제되었거나 없는 돌상 컨셉입니다.'
          : error instanceof AdminApiError && error.status === 400
            ? '입력한 내용을 다시 확인해 주세요.'
            : '돌상 컨셉을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-label={concept ? '돌상 컨셉 수정' : '돌상 컨셉 추가'}
      className="border border-[var(--line)] bg-[var(--surface)] px-5 py-5"
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-5" disabled={isSubmitting}>
        <legend className="sr-only">돌상 컨셉 정보</legend>

        <Field htmlFor={id('name')} label="이름" required>
          <input
            className={`${CONTROL_CLASS_NAME} h-10`}
            id={id('name')}
            maxLength={CONCEPT_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 한복 클래식"
            required
            value={name}
          />
        </Field>

        <Field
          hint={`입력하고 추가를 누르거나 Enter를 치면 목록에 더해집니다. (${components.length} / ${CONCEPT_COMPONENTS_MAX_COUNT}개)`}
          htmlFor={id('components')}
          label="구성품"
        >
          <ComponentListInput
            components={components}
            inputId={id('components')}
            onChange={setComponents}
          />
        </Field>

        <Field htmlFor={id('price')} label="가격" required>
          <div className="relative sm:w-56">
            <input
              className={`${CONTROL_CLASS_NAME} h-10 pr-9 text-right tabular-nums`}
              id={id('price')}
              inputMode="numeric"
              onChange={(event) => setPriceText(toPriceText(event.target.value))}
              placeholder="0"
              required
              value={priceText}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--muted)]">
              원
            </span>
          </div>
        </Field>
      </fieldset>

      <footer className="mt-6 flex flex-col gap-3">
        {errorMessage ? (
          <p className="bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Link
            className="flex h-10 items-center border border-[var(--line)] px-4 text-sm font-medium hover:bg-[var(--background)]"
            href={cancelHref}
          >
            취소
          </Link>
          <button
            className="h-10 bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </footer>
    </form>
  );
}

/** 불러오는 중·없음·오류 안내. 불러왔으면 null */
export function ConceptLoadMessage({ state }: { state: ConceptLoadState }) {
  if (state.kind === 'loading') {
    return <p className="py-10 text-sm text-[var(--muted)]">돌상 컨셉을 불러오고 있습니다.</p>;
  }

  if (state.kind === 'not-found') {
    return <p className="py-10 text-sm text-[var(--muted)]">해당 돌상 컨셉을 찾을 수 없습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="py-10 text-sm text-[var(--error)]" role="alert">
        돌상 컨셉을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return null;
}

export function ChoidolsangConceptEditForm({ id }: { id: string }) {
  const state = useConcept(id);

  return state.kind === 'loaded' ? (
    <ChoidolsangConceptForm concept={state.concept} />
  ) : (
    <ConceptLoadMessage state={state} />
  );
}
