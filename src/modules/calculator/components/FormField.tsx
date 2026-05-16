"use client";

import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export default function FormField({ label, hint, error, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-text-primary">{label}</span>
      {hint && <span className="ml-1 text-[11px] font-medium text-text-secondary">{hint}</span>}
      <span className="mt-1 block">{children}</span>
      {error && <span className="mt-1 block text-xs font-medium text-danger">{error}</span>}
    </label>
  );
}
