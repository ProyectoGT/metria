"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import type { CalculatorScreenProps } from "../../types";
import { calculateCommission, type CommissionMode } from "../../formulas/commission";
import { clamp, parseNumberInput } from "../../formulas/number";
import NumericSliderField from "../../components/NumericSliderField";
import { ResultRow, ResultSummary } from "../../components/ResultSummary";
import { formatCurrency } from "../../components/format";

const COMMISSION_OPTIONS = [3, 4, 5, 6, 8, 10];
const DEFAULT_AMOUNT = 300000;
const MAX_AMOUNT = 1000000;

export default function SimpleCommissionCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const [mode, setMode] = useState<CommissionMode>("base_to_final");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [commissionPercent, setCommissionPercent] = useState(5);
  const [commissionDraft, setCommissionDraft] = useState<string | null>(null);
  const [includeVat, setIncludeVat] = useState(true);

  const result = useMemo(
    () => calculateCommission({ mode, price: amount, commissionPercent, includeVat }),
    [mode, amount, commissionPercent, includeVat],
  );

  function handleModeChange(nextMode: CommissionMode) {
    setMode(nextMode);
  }

  function handleAmountChange(nextAmount: number) {
    setAmount(clamp(nextAmount, 0, MAX_AMOUNT));
  }

  function handleCommissionChange(nextCommissionPercent: number) {
    setCommissionPercent(clamp(nextCommissionPercent, 0, 99.99));
    setCommissionDraft(null);
  }

  function handleManualCommissionChange(nextValue: string) {
    setCommissionDraft(nextValue);
    if (nextValue.trim() === "") return;
    const parsed = parseNumberInput(nextValue, commissionPercent);
    if (!Number.isFinite(parsed)) return;
    const clamped = clamp(parsed, 0, 99.99);
    if (clamped !== commissionPercent) setCommissionPercent(clamped);
  }

  function handleCommissionBlur() {
    setCommissionDraft(null);
  }

  function handleVatToggle() {
    setIncludeVat((current) => !current);
  }

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de comisión",
      mode === "base_to_final" ? `Base vendedor: ${formatCurrency(amount)}` : `Precio final: ${formatCurrency(amount)}`,
      `Comisión: ${commissionPercent.toLocaleString("es-ES")}%`,
      `IVA comisión: ${includeVat ? "Sí" : "No"}`,
      `Comisión agencia: ${formatCurrency(result.commission)}`,
      `IVA: ${formatCurrency(result.commissionVat)}`,
      `Precio comprador: ${formatCurrency(result.buyerPrice)}`,
      `Neto vendedor: ${formatCurrency(result.netSeller)}`,
    ].join("\n"));
  }, [amount, commissionPercent, includeVat, mode, onSummaryChange, result]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <div>
          <p className="text-sm font-semibold text-text-primary">Modo de cálculo</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleModeChange("base_to_final")}
              className={`rounded-ds-md border px-4 py-3 text-sm font-semibold transition-colors ${mode === "base_to_final" ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface-elevated text-text-secondary hover:text-text-primary"}`}
            >
              Base vendedor → precio final
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("final_to_net")}
              className={`rounded-ds-md border px-4 py-3 text-sm font-semibold transition-colors ${mode === "final_to_net" ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface-elevated text-text-secondary hover:text-text-primary"}`}
            >
              Precio final → neto vendedor
            </button>
          </div>
        </div>

        <NumericSliderField
          label={mode === "base_to_final" ? "Precio acordado con vendedor" : "Precio final comprador"}
          value={amount}
          min={0}
          max={MAX_AMOUNT}
          step={1000}
          prefix="€"
          onChange={handleAmountChange}
        />

        <div className="rounded-ds-md border border-border bg-surface-elevated p-4 shadow-layer-1">
          <p className="text-sm font-semibold text-text-primary">Comisión</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {COMMISSION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleCommissionChange(option)}
                className={`rounded-ds-sm border px-3 py-2 text-sm font-semibold transition-colors ${commissionPercent === option ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary hover:text-text-primary"}`}
              >
                {option}%
              </button>
            ))}
            <div className="flex h-10 w-28 items-center rounded-ds-sm border border-border bg-surface px-3">
              <input
                type="text"
                inputMode="decimal"
                value={commissionDraft !== null ? commissionDraft : String(commissionPercent).replace(".", ",")}
                onChange={(event) => handleManualCommissionChange(event.target.value)}
                onBlur={handleCommissionBlur}
                className="w-full bg-transparent text-right text-sm font-semibold text-text-primary outline-none"
              />
              <span className="ml-1 text-sm text-text-secondary">%</span>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant={includeVat ? "primary" : "secondary"}
          onClick={handleVatToggle}
        >
          {includeVat ? "IVA 21% activado" : "Añadir IVA 21% sobre comisión"}
        </Button>
      </div>

      <ResultSummary title="Resultado rápido">
        <ResultRow label="Precio comprador" value={formatCurrency(result.buyerPrice)} highlight />
        <ResultRow label="Neto vendedor" value={formatCurrency(result.netSeller)} highlight />
        {includeVat && <ResultRow label="Precio sin IVA" value={formatCurrency(result.priceWithoutVat)} />}
        <ResultRow label="Comisión agencia" value={formatCurrency(result.commission)} />
        {includeVat && <ResultRow label="IVA sobre comisión" value={formatCurrency(result.commissionVat)} />}
        <ResultRow label="Verificación" value={result.verification} />
      </ResultSummary>
    </div>
  );
}
