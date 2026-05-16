"use client";

import { useState } from "react";
import { cn } from "@/lib/design-system";
import { clamp, isEmptyNumberInput, numberInputText, parseNumberInput } from "../formulas/number";

type NumericSliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  prefix?: string;
  suffix?: string;
  helperText?: string;
  error?: string;
  onChange: (value: number) => void;
};

export default function NumericSliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  prefix,
  suffix,
  helperText,
  error,
  onChange,
}: NumericSliderFieldProps) {
  const decimals = step < 1 ? 2 : 0;
  const safeValue = clamp(value, min, max);
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const textValue = editing ? draftValue : numberInputText(safeValue, decimals);

  function commitText(next: string) {
    setDraftValue(next);
    if (isEmptyNumberInput(next)) return;
    onChange(clamp(parseNumberInput(next, safeValue), min, max));
  }

  function commitBlur() {
    if (!isEmptyNumberInput(draftValue)) {
      const nextValue = clamp(parseNumberInput(draftValue, safeValue), min, max);
      onChange(nextValue);
      setDraftValue(numberInputText(nextValue, decimals));
    } else {
      setDraftValue(numberInputText(safeValue, decimals));
    }
    setEditing(false);
  }

  return (
    <div className={cn("rounded-ds-md border bg-surface-elevated p-4 shadow-layer-1", error ? "border-danger/50" : "border-border")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <label className="text-sm font-semibold text-text-primary">{label}</label>
          {helperText && <p className="mt-1 text-xs text-text-secondary">{helperText}</p>}
          {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
        </div>
        <div className="flex h-10 min-w-32 items-center rounded-ds-sm border border-border bg-surface px-3">
          {prefix && <span className="mr-1 text-sm font-medium text-text-secondary">{prefix}</span>}
          <input
            type="text"
            inputMode="decimal"
            value={textValue}
            onFocus={() => {
              setEditing(true);
              setDraftValue(numberInputText(safeValue, decimals));
            }}
            onChange={(event) => commitText(event.target.value)}
            onBlur={commitBlur}
            className="w-full bg-transparent text-right text-sm font-semibold text-text-primary outline-none"
          />
          {(unit || suffix) && <span className="ml-1 text-sm font-medium text-text-secondary">{unit ?? suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        value={Math.min(Math.max(safeValue, min), max)}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const nextValue = clamp(parseNumberInput(event.target.value, safeValue), min, max);
          setDraftValue(numberInputText(nextValue, decimals));
          onChange(nextValue);
        }}
        className={cn("mt-4 h-2 w-full cursor-pointer accent-primary")}
      />
      <div className="mt-2 flex justify-between text-[11px] font-medium text-text-secondary">
        <span>{prefix}{min.toLocaleString("es-ES")}{unit ? ` ${unit}` : suffix ?? ""}</span>
        <span>{prefix}{max.toLocaleString("es-ES")}{unit ? ` ${unit}` : suffix ?? ""}</span>
      </div>
    </div>
  );
}
