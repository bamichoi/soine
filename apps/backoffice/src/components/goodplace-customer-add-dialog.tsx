'use client';

import { useEffect, useId, useState } from 'react';
import { Modal } from '@/components/modal';
import { AdminApiError } from '@/lib/admin-auth-api';
import {
  createGoodplaceCustomer,
  type GoodplaceCustomerDetail,
} from '@/lib/goodplace-customers-api';
import { formatPhone, isValidMobilePhone } from '@/lib/phone';
import {
  ERROR_BOX_CLASS_NAME,
  FOCUS_CLASS_NAME,
  INPUT_CLASS_NAME,
  INPUT_TEXTAREA_CLASS_NAME,
  PRIMARY_BUTTON_CLASS_NAME,
  SECONDARY_BUTTON_CLASS_NAME,
} from '@/lib/ui';

type GoodplaceCustomerAddDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (customer: GoodplaceCustomerDetail) => void;
  /** 이미 등록된 연락처일 때 고객 찾기로 넘어간다. */
  onFindInstead: () => void;
};

type Failure = { kind: 'invalid'; message: string } | { kind: 'duplicate' } | { kind: 'error' };

function FailureMessage({
  failure,
  onFindInstead,
}: {
  failure: Failure;
  onFindInstead: () => void;
}) {
  if (failure.kind === 'duplicate') {
    return (
      <p className={`flex flex-wrap items-center gap-x-2 ${ERROR_BOX_CLASS_NAME}`} role="alert">
        이미 이 연락처로 등록된 고객이 있습니다.
        <button
          className={`cursor-pointer rounded-sm font-semibold underline underline-offset-2 transition hover:text-[var(--foreground)] hover:decoration-2 ${FOCUS_CLASS_NAME}`}
          onClick={onFindInstead}
          type="button"
        >
          고객 찾기로 고르기
        </button>
      </p>
    );
  }

  return (
    <p className={ERROR_BOX_CLASS_NAME} role="alert">
      {failure.kind === 'invalid'
        ? failure.message
        : '고객을 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
    </p>
  );
}

// 새 고객을 바로 등록하는 모달. 등록하면 그 고객을 고른 것으로 돌려준다.
export function GoodplaceCustomerAddDialog({
  isOpen,
  onClose,
  onAdded,
  onFindInstead,
}: GoodplaceCustomerAddDialogProps) {
  const idPrefix = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [memo, setMemo] = useState('');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setMemo('');
      setFailure(null);
    }
  }, [isOpen]);

  async function handleAdd() {
    if (!name.trim()) {
      setFailure({ kind: 'invalid', message: '이름을 입력해 주세요.' });
      return;
    }

    if (!isValidMobilePhone(phone)) {
      setFailure({
        kind: 'invalid',
        message: '연락처를 010-0000-0000 형식으로 입력해 주세요.',
      });
      return;
    }

    setFailure(null);
    setIsSaving(true);

    try {
      onAdded(
        await createGoodplaceCustomer({
          memo: memo.trim() || null,
          name: name.trim(),
          phone: phone.replace(/\D/g, ''),
        }),
      );
    } catch (error) {
      setFailure(
        error instanceof AdminApiError && error.status === 409
          ? { kind: 'duplicate' }
          : { kind: 'error' },
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      description="고객으로 등록하고 이 미팅의 고객으로 고릅니다."
      footer={
        <>
          <button className={SECONDARY_BUTTON_CLASS_NAME} onClick={onClose} type="button">
            취소
          </button>
          <button
            className={PRIMARY_BUTTON_CLASS_NAME}
            disabled={isSaving}
            onClick={() => void handleAdd()}
            type="button"
          >
            {isSaving ? '추가하는 중...' : '추가'}
          </button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="고객 추가"
    >
      {/* 미팅 폼 안에 그려지므로 form을 겹쳐 쓰지 않는다. */}
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm" htmlFor={`${idPrefix}-name`}>
          <span className="font-semibold">
            이름 <span className="text-[var(--error)]">*</span>
          </span>
          <input
            className={INPUT_CLASS_NAME}
            data-autofocus
            id={`${idPrefix}-name`}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            placeholder="고객 이름"
            value={name}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm" htmlFor={`${idPrefix}-phone`}>
          <span className="font-semibold">
            연락처 <span className="text-[var(--error)]">*</span>
          </span>
          <input
            autoComplete="off"
            className={`${INPUT_CLASS_NAME} tabular-nums`}
            id={`${idPrefix}-phone`}
            inputMode="tel"
            onChange={(event) => setPhone(formatPhone(event.target.value))}
            placeholder="010-1234-5678"
            type="tel"
            value={phone}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm" htmlFor={`${idPrefix}-memo`}>
          <span className="font-semibold">
            메모 <span className="font-normal text-[var(--muted)]">(선택)</span>
          </span>
          <textarea
            className={`${INPUT_TEXTAREA_CLASS_NAME} min-h-20`}
            id={`${idPrefix}-memo`}
            maxLength={5000}
            onChange={(event) => setMemo(event.target.value)}
            value={memo}
          />
        </label>
        {failure ? <FailureMessage failure={failure} onFindInstead={onFindInstead} /> : null}
      </div>
    </Modal>
  );
}
