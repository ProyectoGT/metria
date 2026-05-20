"use client";

import { cn } from "@/lib/design-system";

interface FilterDateRangeProps {
  labelFrom?: string;
  labelTo?: string;
  valueFrom: string;
  valueTo: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  className?: string;
}

export default function FilterDateRange({
  labelFrom = "Desde",
  labelTo = "Hasta",
  valueFrom,
  valueTo,
  onChangeFrom,
  onChangeTo,
  className,
}: FilterDateRangeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1">
        {labelFrom && (
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {labelFrom}
          </label>
        )}
        <input
          type="date"
          value={valueFrom}
          onChange={(e) => onChangeFrom(e.target.value)}
          className="input h-9 py-0 text-sm"
          aria-label={labelFrom}
        />
      </div>
      <span className="mt-6 text-text-secondary">—</span>
      <div className="flex-1">
        {labelTo && (
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {labelTo}
          </label>
        )}
        <input
          type="date"
          value={valueTo}
          onChange={(e) => onChangeTo(e.target.value)}
          className="input h-9 py-0 text-sm"
          aria-label={labelTo}
        />
      </div>
    </div>
  );
}
