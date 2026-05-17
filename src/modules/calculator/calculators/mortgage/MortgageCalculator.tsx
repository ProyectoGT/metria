"use client";

import { useEffect } from "react";
import { useForm, useWatch, type FieldPath, type FieldPathValue } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import FormField from "../../components/FormField";
import NumericSliderField from "../../components/NumericSliderField";
import { ResultRow, ResultSummary } from "../../components/ResultSummary";
import ScenarioComparison from "../../components/ScenarioComparison";
import { formatCurrency, formatPercent } from "../../components/format";
import { ViabilityBadge } from "../../components/ViabilityBadge";
import { calculateAdvancedMortgage, calculateMortgageRateScenarios, calculateMortgageTermScenarios } from "../../formulas/mortgage";
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
  const input: MortgageFormValues = { ...DEFAULTS, ...values };
  const result = calculateAdvancedMortgage({
    propertyPrice: input.price,
    downPayment: input.downPayment,
    annualInterestRate: input.annualInterestRate,
    years: input.years,
    monthlyIncome: input.monthlyIncome,
    monthlyDebt: input.monthlyDebt,
  });
  const principal = result.financedAmount;
  const termScenarios = calculateMortgageTermScenarios({
    principal,
    annualInterestRate: input.annualInterestRate,
    years: input.years,
    monthlyIncome: input.monthlyIncome,
    monthlyDebt: input.monthlyDebt,
  });
  const rateScenarios = calculateMortgageRateScenarios({
    principal,
    annualInterestRate: input.annualInterestRate,
    years: input.years,
    monthlyIncome: input.monthlyIncome,
    monthlyDebt: input.monthlyDebt,
  });

  const setCurrentValue = <K extends FieldPath<MortgageFormValues>>(name: K, value: FieldPathValue<MortgageFormValues, K>) => {
    setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };
  const setFinancedAmount = (value: number) => {
    const financedAmount = Math.min(Math.max(value, 0), input.price);
    setCurrentValue("downPayment", input.price - financedAmount);
    setCurrentValue("principal", financedAmount);
    setCurrentValue("financingPercent", input.price > 0 ? (financedAmount / input.price) * 100 : 0);
  };

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de hipoteca",
      `Precio vivienda: ${formatCurrency(input.price)}`,
      `Entrada: ${formatCurrency(input.downPayment)}`,
      `Hipoteca: ${formatCurrency(principal)}`,
      `Plazo: ${input.years} años`,
      `TIN: ${input.annualInterestRate.toLocaleString("es-ES")}%`,
      `Cuota estimada: ${formatCurrency(result.monthlyPayment)}/mes`,
      `Intereses totales: ${formatCurrency(result.totalInterest)}`,
    ].join("\n"));
  }, [
    input.annualInterestRate,
    input.downPayment,
    input.price,
    input.years,
    onSummaryChange,
    principal,
    result.monthlyPayment,
    result.totalInterest,
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <NumericSliderField
          label="Precio vivienda"
          value={input.price}
          min={0}
          max={1000000}
          step={1000}
          prefix="€"
          onChange={(value) => {
            setCurrentValue("price", value);
            if (input.downPayment > value) {
              setCurrentValue("downPayment", value);
            }
          }}
        />
        <NumericSliderField
          label="Entrada aportada"
          value={input.downPayment}
          min={0}
          max={input.price}
          step={1000}
          prefix="€"
          onChange={(value) => setCurrentValue("downPayment", value)}
        />
        <NumericSliderField
          label="Importe a financiar"
          value={principal}
          min={0}
          max={input.price}
          step={1000}
          prefix="€"
          onChange={setFinancedAmount}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Tipo hipoteca">
            <select className="input" value={input.mortgageKind} onChange={(event) => setCurrentValue("mortgageKind", event.target.value as MortgageFormValues["mortgageKind"])}>
              <option value="fixed">Fija</option>
              <option value="variable">Variable</option>
              <option value="mixed">Mixta</option>
            </select>
          </FormField>
          <CompactNumberField label="TAE orientativa" value={input.tae} step={0.1} onChange={(value) => setCurrentValue("tae", value)} />
        </div>
        <NumericSliderField label="Tipo interés nominal" value={input.annualInterestRate} min={0} max={10} step={0.1} unit="%" onChange={(value) => setCurrentValue("annualInterestRate", value)} />
        <NumericSliderField label="Plazo" value={input.years} min={5} max={40} step={1} unit="años" onChange={(value) => setCurrentValue("years", value)} />
        <NumericSliderField label="Ingresos mensuales" value={input.monthlyIncome} min={0} max={12000} step={100} prefix="€" onChange={(value) => setCurrentValue("monthlyIncome", value)} />
        <NumericSliderField label="Deudas mensuales" value={input.monthlyDebt} min={0} max={4000} step={50} prefix="€" onChange={(value) => setCurrentValue("monthlyDebt", value)} />
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

function MortgageResults({ result }: { result: ReturnType<typeof calculateAdvancedMortgage> }) {
  return (
    <ResultSummary title="Resultado hipotecario">
      <div className="flex items-center justify-between rounded-ds-md bg-surface-muted px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">Ratio cuota / ingresos</span>
        <ViabilityBadge status={result.viability} />
      </div>
      <ResultRow label="Cuota mensual" value={formatCurrency(result.monthlyPayment)} highlight />
      <ResultRow label="Capital financiado" value={formatCurrency(result.financedAmount)} />
      <ResultRow label="Intereses totales" value={formatCurrency(result.totalInterest)} />
      <ResultRow label="Total pagado" value={formatCurrency(result.totalPaid)} />
      <ResultRow label="Ratio endeudamiento" value={formatPercent(result.debtRatio)} />
      <ResultRow label="Ahorro recomendado" value={formatCurrency(result.financedAmount * 0.25)} />
    </ResultSummary>
  );
}
