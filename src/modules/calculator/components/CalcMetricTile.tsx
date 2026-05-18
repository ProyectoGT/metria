"use client";

import { cn } from "@/lib/design-system";

type Props = {
  label: string;
  value: string;
  highlight?: boolean;
};

export function CalcMetricTile({ label, value, highlight }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl p-3",
        highlight ? "border border-border bg-surface" : "bg-background",
      )}
    >
      <p className="text-[11px] text-text-secondary">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-medium leading-tight",
          highlight ? "text-primary" : "text-text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
