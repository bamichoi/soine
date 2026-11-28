'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { KkiruCustomerAddDialog } from '@/components/kkiru-customer-add-dialog';
import { KkiruCustomerSearchDialog } from '@/components/kkiru-customer-search-dialog';
import { getKkiruCustomer } from '@/lib/kkiru-customers-api';
import { formatPhone } from '@/lib/phone';

export type PickedCustomer = { code: string; name: string; phone: string };

type KkiruCustomerPickerProps = {
  value: PickedCustomer | null;
  onChange: (value: PickedCustomer | null) => void;
  /** 주소로 넘어온 고객 번호 (고객 상세의 새 미팅) */
  initialCode?: string | null;
};

const ACTION_BUTTON_CLASS_NAME =
  'inline-flex h-10 items-center gap-1.5 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--background)]';

/** 고른 고객의 이름·연락처를 보여 주는 칸. 직접 입력하지 않는다. */
function ValueBox({ label, value }: { label: string; value: string | null }) {
  return (
    <div
      className={`flex h-10 min-w-0 flex-1 items-center border border-[var(--line)] px-3 text-sm sm:max-w-56 ${
        value ? 'bg-[var(--surface)]' : 'bg-[var(--background)] text-[var(--muted)]'
      }`}
    >
      {value ? <span className="sr-only">{label}: </span> : null}
      <span className="truncate tabular-nums">{value ?? label}</span>
    </div>
  );
}

// 미팅의 고객. '고객 찾기'로 등록된 고객을 고르거나 '고객 추가'로 새로 등록해 고른다.
export function KkiruCustomerPicker({ value, onChange, initialCode }: KkiruCustomerPickerProps) {
  const [openDialog, setOpenDialog] = useState<'search' | 'add' | null>(null);
  const [message, setMessage] = useState('');
  // 주소로 넘어온 고객은 처음 한 번만 불러온다. 부모 콜백이 바뀌어도 다시 부르지 않도록 ref로 둔다.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!initialCode) {
      return;
    }

    getKkiruCustomer(initialCode)
      .then((customer) =>
        onChangeRef.current({ code: customer.code, name: customer.name, phone: customer.phone }),
      )
      .catch(() => setMessage('고객을 불러오지 못했습니다. 고객 찾기로 골라 주세요.'));
  }, [initialCode]);

  function pick(customer: PickedCustomer) {
    onChange({ code: customer.code, name: customer.name, phone: customer.phone });
    setOpenDialog(null);
    setMessage('');
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ValueBox label="고객 이름" value={value?.name ?? null} />
        <ValueBox label="연락처" value={value ? formatPhone(value.phone) : null} />
        {value ? (
          <button
            aria-label={`고객 ${value.name} 선택 삭제`}
            className={ACTION_BUTTON_CLASS_NAME}
            onClick={() => onChange(null)}
            type="button"
          >
            삭제
          </button>
        ) : (
          <>
            <button
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={() => setOpenDialog('search')}
              type="button"
            >
              <Icon className="size-4" name="search" />
              고객 찾기
            </button>
            <button
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={() => setOpenDialog('add')}
              type="button"
            >
              <Icon className="size-4" name="plus" />
              고객 추가
            </button>
          </>
        )}
      </div>
      {value ? (
        <p className="text-xs text-[var(--muted)]">
          고객 번호 <span className="font-mono">{value.code}</span>
        </p>
      ) : null}
      {message ? <p className="text-xs text-[var(--error)]">{message}</p> : null}

      <KkiruCustomerSearchDialog
        isOpen={openDialog === 'search'}
        onAddInstead={() => setOpenDialog('add')}
        onClose={() => setOpenDialog(null)}
        onPick={pick}
      />
      <KkiruCustomerAddDialog
        isOpen={openDialog === 'add'}
        onAdded={pick}
        onClose={() => setOpenDialog(null)}
        onFindInstead={() => setOpenDialog('search')}
      />
    </div>
  );
}
