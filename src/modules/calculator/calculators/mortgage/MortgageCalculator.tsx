"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import FormField from "../../components/FormField";
import NumericSliderField from "../../components/NumericSliderField";
import { ResultRow, ResultSummary } from "../../components/ResultSummary";
import ScenarioComparison from "../../components/ScenarioComparison";
import { formatCurrency, formatPercent } from "../../components/format";
import { ViabilityBadge } from "../../components/ViabilityBadge";
import { calculateMortgage, calculateMortgageRateScenarios, calculateMortgageTermScenarios } from "../../formulas/mortgage";
import { mortgageSchema, type MortgageFormValues } from "../../schemas/mortgage.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: MortgageFormValues = {
  price: 300000,
  downPayment: 60000,
  principal: 240000,
  financingPercent: 80,
  annualInterestRate: 3.5,
  tae: 3.8,
  years: 30,
  mortgageKind: "fixed",
  monthlyIncome: 3500,
  monthlyDebt: 150,
};

export default function MortgageCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue } = useForm<MortgageFormValues>({
    resolver: calculatorResolver(mortgageSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const principal = values.principal ?? DEFAULTS.principal;
  const annualInterestRate = values.annualInterestRate ?? DEFAULTS.annualInterestRate;
  const years = values.years ?? DEFAULTS.years;
  const monthlyIncome = values.monthlyIncome ?? DEFAULTS.monthlyIncome;
  const monthlyDebt = values.monthlyDebt ?? DEFAULTS.monthlyDebt;
  const result = useMemo(() => calculateMortgage({ principal, annualInterestRate, years, monthlyIncome, monthlyDebt }), [principal, annualInterestRate, years, monthlyIncome, monthlyDebt]);
  const termScenarios = useMemo(() => calculateMortgageTermScenarios({ principal, annualInterestRate, years, monthlyIncome, monthlyDebt }), [principal, annualInterestRate, years, monthlyIncome, monthlyDebt]);
  const rateScenarios = useMemo(() => calculateMortgageRateScenarios({ principal, annualInterestRate, years, monthlyIncome, monthlyDebt }), [principal, annualInterestRate, years, monthlyIncome, monthlyDebt]);

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de hipoteca",
      `Precio vivienda: ${formatCurrency(values.price ?? 0)}`,
      `Entrada: ${formatCurrency(values.downPayment ?? 0)}`,
      `Hipoteca: ${formatCurrency(principal)}`,
      `Plazo: ${years} años`,
      `TIN: ${annualInterestRate.toLocaleString("es-ES")}%`,
      `Cuota estimada: ${formatCurrency(result.monthlyPayment)}/mes`,
      `Intereses totales: ${formatCurrency(result.totalInterest)}`,
    ].join("\n"));
  }, [annualInterestRate, onSummaryChange, principal, result.monthlyPayment, result.totalInterest, values.downPayment, values.price, years]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <NumericSliderField label="Precio vivienda" value={values.price ?? DEFAULTS.price} min={0} max={1000000} step={1000} prefix="€" onChange={(value) => setValue("price", value, { shouldValidate: true })} />
        <NumericSliderField label="Entrada aportada" value={values.downPayment ?? DEFAULTS.downPayment} min={0} max={500000} step={1000} prefix="€" onChange={(value) => setValue("downPayment", value, { shouldValidate: true })} />
        <NumericSliderField label="Importe a financiar" value={principal} min={0} max={900000} step={1000} prefix="€" onChange={(value) => setValue("principal", value, { shouldValidate: true })} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Tipo hipoteca">
            <select className="input" value={values.mortgageKind ?? DEFAULTS.mortgageKind} onChange={(event) => setValue("mortgageKind", event.target.value as MortgageFormValues["mortgageKind"], { shouldValidate: true })}>
              <option value="fixed">Fija</option>
              <option value="variable">Variable</option>
              <option value="mixed">Mixta</option>
            </select>
          </FormField>
          <CompactNumberField label="TAE orientativa" value={values.tae ?? DEFAULTS.tae} step={0.1} onChange={(value) => setValue("tae", value, { shouldValidate: true })} />
        </div>
        <NumericSliderField label="Tipo interés nominal" value={annualInterestRate} min={0} max={10} step={0.1} unit="%" onChange={(value) => setValue("annualInterestRate", value, { shouldValidate: true })} />
        <NumericSliderField label="Plazo" value={years} min={5} max={40} step={1} unit="años" onChange={(value) => setValue("years", value, { shouldValidate: true })} />
        <NumericSliderField label="Ingresos mensuales" value={monthlyIncome} min={0} max={12000} step={100} prefix="€" onChange={(value) => setValue("monthlyIncome", value, { shouldValidate: true })} />
        <NumericSliderField label="Deudas mensuales" value={monthlyDebt} min={0} max={4000} step={50} prefix="€" onChange={(value) => setValue("monthlyDebt", value, { shouldValidate: true })} />
      </div>

      <div className="space-y-4">
        <MortgageResults result={result} />
        <ScenarioComparison
          columns={["Plazo", "Cuota", "Intereses"]}
          rows={termScenarios.map((scenario) => ({
            id: String(scenario.months),
            featured: scenario.months === result.months,
            cells: [`${scenario.months / 12} años`, formatCurrency(scenario.monthlyPayment), formatCurrency(scenario.totalInterest)],
          }))}
        />
        <ScenarioComparison
          columns={["Tipo", "Cuota", "Ratio"]}
          rows={rateScenarios.map((scenario, index) => ({
            id: `rate-${index}`,
            featured: index === 1,
            cells: [index === 0 ? "-0,5%" : index === 1 ? "Actual" : "+0,5%", formatCurrency(scenario.monthlyPayment), formatPercent(scenario.debtRatio)],
          }))}
        />
      </div>
    </div>
  );
}

function MortgageResults({ result }: { result: ReturnType<typeof calculateMortgage> }) {
  return (
    <ResultSummary title="Resultado hipotecario">
      <div className="flex items-center justify-between rounded-ds-md bg-surface-muted px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">Ratio cuota / ingresos</span>
        <ViabilityBadge status={result.viability} />
      </div>
      <ResultRow label="Cuota mensual" value={formatCurrency(result.monthlyPayment)} highlight />
      <ResultRow label="Capital financiado" value={formatCurrency(result.principal)} />
      <ResultRow label="Intereses totales" value={formatCurrency(result.totalInterest)} />
      <ResultRow label="Total pagado" value={formatCurrency(result.totalPaid)} />
      <ResultRow label="Ratio endeudamiento" value={formatPercent(result.debtRatio)} />
      <ResultRow label="Ahorro recomendado" value={formatCurrency(result.principal * 0.25)} />
    </ResultSummary>
  );
}
