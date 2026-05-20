"use client";

import { useState } from "react";
import FormField from "./FormField";
import { isEmptyNumberInput, numberInputText, parseNumberInput } from "../formulas/number";

type CompactNumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  step?: number;
  error?: string;
};

export default function CompactNumberField({ label, value, onChange, hint, step = 1, error }: CompactNumberFieldProps) {
  const decimals = step < 1 ? 2 : 0;
  const safeValue = Number.isFinite(value) ? value : 0;

  // draft === null  → input sincronizado con safeValue
  // draft === string → usuario editando
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : numberInputText(safeValue, decimals);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDraft(next);
    if (isEmptyNumberInput(next)) return;
    const parsed = parseNumberInput(next, safeValue);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(parsed, 0);
    if (clamped !== safeValue) onChange(clamped);
  }

  function handleBlur() {
    setDraft(null);
  }

  return (
    <FormField label={label} hint={hint} error={error}>
      <input
        className="input"
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </FormField>
  );
}
