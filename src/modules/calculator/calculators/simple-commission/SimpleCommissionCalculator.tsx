"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalculatorScreenProps } from "../../types";
import { calculateCommission, type CommissionMode } from "../../formulas/commission";
import { clamp, isValidNumberInput, parseNumberInput } from "../../formulas/number";
import { CalcSection } from "../../components/CalcSection";
import { CalcSliderInput } from "../../components/CalcSliderInput";
import { CalcHeroResult } from "../../components/CalcHeroResult";
import { CalcMetricTile } from "../../components/CalcMetricTile";
import { formatCurrency } from "../../components/format";
import { AdvisoryNote } from "../../components/ResultSummary";

const COMMISSION_OPTIONS = [3, 4, 5, 6, 8, 10];
const DEFAULT_AMOUNT = 300000;
const MAX_AMOUNT = 1000000;

export default function SimpleCommissionCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const [mode, setMode] = useState<CommissionMode>("base_to_final");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [commissionPercent, setCommissionPercent] = useState(5);
  const [commissionText, setCommissionText] = useState("5");
  const [commissionError, setCommissionError] = useState(false);
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

  function handleCommissionChange(nextPct: number) {
    setCommissionPercent(clamp(nextPct, 0, 99.99));
    setCommissionText(String(nextPct).replace(".", ","));
    setCommissionError(false);
  }

  function handleManualCommissionChange(nextValue: string) {
    setCommissionText(nextValue);
    setCommissionError(false);
    if (nextValue.trim() === "" || !isValidNumberInput(nextValue)) {
      setCommissionError(true);
      return;
    }
    const parsed = parseNumberInput(nextValue, NaN);
    if (!Number.isFinite(parsed)) {
      setCommissionError(true);
      return;
    }
    const clamped = clamp(parsed, 0, 99.99);
    if (clamped !== commissionPercent) setCommissionPercent(clamped);
  }

  useEffect(() => {
    onSummaryChange?.([
      "Simulacion de comision",
      mode === "base_to_final"
        ? `Base vendedor: ${formatCurrency(amount)}`
        : `Precio final: ${formatCurrency(amount)}`,
      `Comision: ${commissionPercent.toLocaleString("es-ES")}%`,
      `IVA comision: ${includeVat ? "Si" : "No"}`,
      `Comision agencia: ${formatCurrency(result.commission)}`,
      `IVA: ${formatCurrency(result.commissionVat)}`,
      `Precio comprador: ${formatCurrency(result.buyerPrice)}`,
      `Neto vendedor: ${formatCurrency(result.netSeller)}`,
    ].join("\n"));
  }, [amount, commissionPercent, includeVat, mode, onSummaryChange, result]);

  const heroLabel = mode === "base_to_final" ? "Precio al comprador" : "Neto para el vendedor";
  const heroValue = mode === "base_to_final" ? result.buyerPrice : result.netSeller;
  const secondLabel = mode === "base_to_final" ? "Neto vendedor" : "Precio comprador";
  const secondValue = mode === "base_to_final" ? result.netSeller : result.buyerPrice;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label={heroLabel}
          value={formatCurrency(heroValue)}
          status="neutral"
          secondaryLabel={secondLabel}
          secondaryValue={formatCurrency(secondValue)}
          helpText={`Comision del ${commissionPercent.toLocaleString("es-ES")}%${includeVat ? " + IVA 21%" : ""} sobre el precio final`}
        />
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="Comision agencia" value={formatCurrency(result.commission)} />
          {includeVat && <CalcMetricTile label="IVA sobre comision" value={formatCurrency(result.commissionVat)} />}
          {includeVat && <CalcMetricTile label="Precio sin IVA" value={formatCurrency(result.priceWithoutVat)} />}
          <CalcMetricTile label="Verificacion" value={result.verification} />
        </div>
      </div>

      {/* Panel de inputs */}
      <div className="flex flex-col gap-4">
        {/* Modo de calculo */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Modo de calculo
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleModeChange("base_to_final")}
              className={`rounded-ds-md border px-4 py-3 text-sm font-semibold transition-colors ${mode === "base_to_final" ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:text-text-primary"}`}
            >
              Base vendedor → precio final
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("final_to_net")}
              className={`rounded-ds-md border px-4 py-3 text-sm font-semibold transition-colors ${mode === "final_to_net" ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:text-text-primary"}`}
            >
              Precio final → neto vendedor
            </button>
          </div>
        </div>

        <CalcSection label="El precio">
          <CalcSliderInput
            label={mode === "base_to_final" ? "Precio acordado con vendedor" : "Precio final al comprador"}
            value={amount}
            min={0}
            max={MAX_AMOUNT}
            step={1000}
            prefix="€"
            onChange={handleAmountChange}
          />
        </CalcSection>

        <CalcSection label="Comision">
          <div>
            <p className="mb-2 text-sm text-text-secondary">Porcentaje de comision</p>
            <div className="flex flex-wrap gap-2">
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
              <div
                className={`flex h-10 w-28 items-center rounded-ds-sm border bg-background px-3 ${commissionError ? "border-danger" : "border-border"}`}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={commissionText}
                  onChange={(e) => handleManualCommissionChange(e.target.value)}
                  onBlur={() => {
                    setCommissionText(String(commissionPercent).replace(".", ","));
                    setCommissionError(false);
                  }}
                  className="w-full bg-transparent text-right text-sm font-semibold text-text-primary outline-none"
                />
                <span className="ml-1 text-sm text-text-secondary">%</span>
              </div>
            </div>
            {commissionError && (
              <p className="mt-1 text-xs text-danger">La comision debe estar entre 0% y 99,99%.</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">IVA sobre la comision (21%)</span>
            <button
              type="button"
              onClick={() => setIncludeVat((v) => !v)}
              className={`rounded-ds-sm border px-3 py-1.5 text-sm font-semibold transition-colors ${includeVat ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:text-text-primary"}`}
            >
              {includeVat ? "Activado" : "Desactivado"}
            </button>
          </div>
        </CalcSection>

        <AdvisoryNote>
          La comision se calcula sobre el precio final. Si activas el IVA, se suma el 21% solo sobre la comision.
        </AdvisoryNote>
      </div>
    </div>
  );
}
