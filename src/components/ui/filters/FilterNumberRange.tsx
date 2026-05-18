"use client";

import { cn } from "@/lib/design-system";

interface FilterNumberRangeProps {
  labelMin?: string;
  labelMax?: string;
  valueMin: string;
  valueMax: string;
  onChangeMin: (value: string) => void;
  onChangeMax: (value: string) => void;
  placeholderMin?: string;
  placeholderMax?: string;
  invalid?: boolean;
  invalidMessage?: string;
  className?: string;
}

export default function FilterNumberRange({
  labelMin = "Desde",
  labelMax = "Hasta",
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  placeholderMin = "Min",
  placeholderMax = "Max",
  invalid = false,
  invalidMessage,
  className,
}: FilterNumberRangeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1">
        {labelMin && (
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {labelMin}
          </label>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={valueMin}
          onChange={(e) => onChangeMin(e.target.value)}
          placeholder={placeholderMin}
          className={cn(
            "input h-9 py-0 text-sm transition-colors",
            invalid ? "border-danger focus:border-danger" : ""
          )}
          aria-invalid={invalid}
        />
      </div>
      <span className="mt-6 text-text-secondary">—</span>
      <div className="flex-1">
        {labelMax && (
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {labelMax}
          </label>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={valueMax}
          onChange={(e) => onChangeMax(e.target.value)}
          placeholder={placeholderMax}
          className={cn(
            "input h-9 py-0 text-sm transition-colors",
            invalid ? "border-danger focus:border-danger" : ""
          )}
          aria-invalid={invalid}
        />
      </div>
      {invalid && invalidMessage && (
        <p className="col-span-2 text-xs font-medium text-danger">{invalidMessage}</p>
      )}
    </div>
  );
}
