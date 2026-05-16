"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/design-system";

type ResultSummaryProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function ResultSummary({ title, children, footer }: ResultSummaryProps) {
  return (
    <div className="rounded-ds-lg border border-border bg-surface shadow-layer-1">
      <div className="border-b border-border bg-surface-elevated px-5 py-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <div className="space-y-2 p-4">{children}</div>
      {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
    </div>
  );
}

export function ResultRow({
  label,
  value,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-ds-md px-4 py-3",
        highlight ? "border border-primary/30 bg-primary-soft" : "bg-surface-muted",
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-sm", highlight ? "font-semibold text-primary" : "text-text-secondary")}>{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-text-secondary">{hint}</p>}
      </div>
      <p className={cn("min-w-0 max-w-[55%] break-words text-right text-sm font-semibold", highlight ? "text-primary" : "text-text-primary")}>{value}</p>
    </div>
  );
}

export function AdvisoryNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-ds-md border border-warning/30 bg-warning-soft px-4 py-3 text-xs leading-relaxed text-text-primary">
      {children}
    </div>
  );
}
