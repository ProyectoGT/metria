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
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState("");
  const textValue = editing ? draftValue : numberInputText(safeValue, decimals);

  function updateValue(next: string) {
    setDraftValue(next);
    if (isEmptyNumberInput(next)) return;
    onChange(Math.max(parseNumberInput(next, safeValue), 0));
  }

  return (
    <FormField label={label} hint={hint} error={error}>
      <input
        className="input"
        type="text"
        inputMode="decimal"
        value={textValue}
        onFocus={() => {
          setEditing(true);
          setDraftValue(numberInputText(safeValue, decimals));
        }}
        onChange={(event) => updateValue(event.target.value)}
        onBlur={() => setEditing(false)}
      />
    </FormField>
  );
}
