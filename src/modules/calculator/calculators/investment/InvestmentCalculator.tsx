"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import NumericSliderField from "../../components/NumericSliderField";
import { ResultRow, ResultSummary } from "../../components/ResultSummary";
import { formatCurrency, formatPercent } from "../../components/format";
import { InvestmentBadge } from "../../components/ViabilityBadge";
import { calculateInvestmentYield } from "../../formulas/investment";
import { investmentSchema, type InvestmentFormValues } from "../../schemas/investment.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: InvestmentFormValues = {
  purchasePrice: 180000,
  purchaseCosts: 18000,
  renovation: 12000,
  furniture: 5000,
  monthlyRent: 1100,
  annualIbi: 450,
  monthlyCommunity: 75,
  annualInsurance: 280,
  annualMaintenance: 600,
  vacancyPercent: 5,
  hasFinancing: true,
  monthlyMortgagePayment: 620,
  targetYield: 5,
};

export default function InvestmentCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue } = useForm<InvestmentFormValues>({
    resolver: calculatorResolver(investmentSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const result = useMemo(
    () => calculateInvestmentYield({ ...DEFAULTS, ...values, monthlyMortgagePayment: values.hasFinancing ? values.monthlyMortgagePayment : 0 }),
    [values],
  );

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de inversión",
      `Precio compra: ${formatCurrency(values.purchasePrice ?? 0)}`,
      `Alquiler mensual: ${formatCurrency(values.monthlyRent ?? 0)}`,
      `Rentabilidad bruta: ${formatPercent(result.grossYield)}`,
      `Rentabilidad neta: ${formatPercent(result.netYield)}`,
      `Cashflow mensual: ${formatCurrency(result.monthlyCashflow)}`,
    ].join("\n"));
  }, [onSummaryChange, result.grossYield, result.monthlyCashflow, result.netYield, values.monthlyRent, values.purchasePrice]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <NumericSliderField label="Precio compra" value={values.purchasePrice ?? DEFAULTS.purchasePrice} min={0} max={1000000} step={1000} prefix="€" onChange={(value) => setValue("purchasePrice", value, { shouldValidate: true })} />
        <NumericSliderField label="Alquiler mensual estimado" value={values.monthlyRent ?? DEFAULTS.monthlyRent} min={0} max={6000} step={50} prefix="€" onChange={(value) => setValue("monthlyRent", value, { shouldValidate: true })} />
        <NumericSliderField label="Gastos compra" value={values.purchaseCosts ?? DEFAULTS.purchaseCosts} min={0} max={150000} step={500} prefix="€" onChange={(value) => setValue("purchaseCosts", value, { shouldValidate: true })} />
        <NumericSliderField label="Reforma + mobiliario" value={(values.renovation ?? 0) + (values.furniture ?? 0)} min={0} max={150000} step={500} prefix="€" onChange={(value) => {
          setValue("renovation", value, { shouldValidate: true });
          setValue("furniture", 0, { shouldValidate: true });
        }} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CompactNumberField label="IBI anual" value={values.annualIbi ?? DEFAULTS.annualIbi} onChange={(value) => setValue("annualIbi", value, { shouldValidate: true })} />
          <CompactNumberField label="Comunidad mensual" value={values.monthlyCommunity ?? DEFAULTS.monthlyCommunity} onChange={(value) => setValue("monthlyCommunity", value, { shouldValidate: true })} />
          <CompactNumberField label="Seguro anual" value={values.annualInsurance ?? DEFAULTS.annualInsurance} onChange={(value) => setValue("annualInsurance", value, { shouldValidate: true })} />
          <CompactNumberField label="Mantenimiento anual" value={values.annualMaintenance ?? DEFAULTS.annualMaintenance} onChange={(value) => setValue("annualMaintenance", value, { shouldValidate: true })} />
        </div>
        <NumericSliderField label="Vacancia estimada" value={values.vacancyPercent ?? DEFAULTS.vacancyPercent} min={0} max={30} step={1} unit="%" onChange={(value) => setValue("vacancyPercent", value, { shouldValidate: true })} />
        <NumericSliderField label="Cuota hipotecaria" value={values.monthlyMortgagePayment ?? DEFAULTS.monthlyMortgagePayment} min={0} max={4000} step={25} prefix="€" onChange={(value) => setValue("monthlyMortgagePayment", value, { shouldValidate: true })} />
        <label className="flex items-center gap-2 rounded-ds-md border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary">
          <input type="checkbox" checked={values.hasFinancing ?? DEFAULTS.hasFinancing} onChange={(event) => setValue("hasFinancing", event.target.checked, { shouldValidate: true })} />
          Tiene financiación
        </label>
      </div>

      <ResultSummary title="Rentabilidad inversión">
        <div className="flex items-center justify-between rounded-ds-md bg-surface-muted px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">Semáforo</span>
          <InvestmentBadge status={result.status} />
        </div>
        <ResultRow label="Rentabilidad bruta" value={formatPercent(result.grossYield)} highlight />
        <ResultRow label="Rentabilidad neta" value={formatPercent(result.netYield)} highlight />
        <ResultRow label="Cashflow mensual" value={formatCurrency(result.monthlyCashflow)} />
        <ResultRow label="Cashflow anual" value={formatCurrency(result.annualCashflow)} />
        <ResultRow label="Inversión inicial" value={formatCurrency(result.initialInvestment)} />
        <ResultRow label="Recuperación" value={`${result.paybackYears.toLocaleString("es-ES", { maximumFractionDigits: 1 })} años`} />
        <ResultRow label="Precio objetivo" value={formatCurrency(result.maxPriceForTargetYield)} />
      </ResultSummary>
    </div>
  );
}
