import type { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
};

// 폼 한 줄 (docs/design/goodplace-style-guide.md '폼'): 넓은 화면에서는 왼쪽에 이름, 오른쪽에 입력칸을 둔다.
export function FormField({ label, htmlFor, required = false, hint, children }: FormFieldProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <label className="pt-3 text-sm font-semibold" htmlFor={htmlFor}>
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
