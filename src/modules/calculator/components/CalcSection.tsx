"use client";

import type { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
};

export function CalcSection({ label, children }: Props) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="[&>*+*]:mt-3 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
