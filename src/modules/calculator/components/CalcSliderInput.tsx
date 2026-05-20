"use client";

import { useState } from "react";
import { cn } from "@/lib/design-system";
import { clamp, isEmptyNumberInput, numberInputText, parseNumberInput } from "../formulas/number";

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  prefix?: string;
  showSlider?: boolean;
  helperText?: string;
  error?: string;
};

export function CalcSliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  prefix,
  showSlider = true,
  helperText,
  error,
}: Props) {
  const decimals = step < 1 ? 2 : 0;
  const safeValue = clamp(value, min, max);
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : numberInputText(safeValue, decimals);

  function emitParsed(next: string) {
    if (isEmptyNumberInput(next)) return;
    const parsed = parseNumberInput(next, safeValue);
    if (!Number.isFinite(parsed)) return;
    const clamped = clamp(parsed, min, max);
    if (clamped !== safeValue) onChange(clamped);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 shrink">
          <span className="text-sm text-text-secondary">{label}</span>
          {helperText && <p className="text-[11px] text-text-secondary/70">{helperText}</p>}
          {error && <p className="text-[11px] text-danger">{error}</p>}
        </div>
        <div
          className={cn(
            "flex h-9 min-w-28 shrink-0 items-center rounded-ds-sm border bg-background px-3",
            error ? "border-danger" : "border-border",
          )}
        >
          {prefix && <span className="mr-1 text-xs text-text-secondary">{prefix}</span>}
          <input
            type="text"
            inputMode="decimal"
            value={display}
            onChange={(e) => {
              setDraft(e.target.value);
              emitParsed(e.target.value);
            }}
            onBlur={() => setDraft(null)}
            className="w-full bg-transparent text-right text-sm font-semibold text-text-primary outline-none"
          />
          {unit && <span className="ml-1 text-xs text-text-secondary">{unit}</span>}
        </div>
      </div>
      {showSlider && (
        <input
          type="range"
          value={safeValue}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setDraft(null);
            const next = clamp(parseNumberInput(e.target.value, safeValue), min, max);
            if (next !== safeValue) onChange(next);
          }}
          className="mt-2 h-1.5 w-full cursor-pointer accent-primary"
        />
      )}
    </div>
  );
}
