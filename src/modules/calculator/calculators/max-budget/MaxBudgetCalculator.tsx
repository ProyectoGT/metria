"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import FormField from "../../components/FormField";
import NumericSliderField from "../../components/NumericSliderField";
import { ResultRow, ResultSummary } from "../../components/ResultSummary";
import { formatCurrency } from "../../components/format";
import { calculateMaxPurchasePrice } from "../../formulas/maxBudget";
import { maxBudgetSchema, type MaxBudgetFormValues } from "../../schemas/max-budget.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: MaxBudgetFormValues = {
  savings: 90000,
  monthlyIncome: 3500,
  monthlyDebt: 200,
  comfortableMonthlyPayment: 1100,
  years: 30,
  annualInterestRate: 3.5,
  financingPercent: 80,
  autonomousCommunity: "Cataluña",
  propertyKind: "used",
};

export default function MaxBudgetCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue } = useForm<MaxBudgetFormValues>({
    resolver: calculatorResolver(maxBudgetSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const result = useMemo(() => calculateMaxPurchasePrice({ ...DEFAULTS, ...values }), [values]);

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de precio máximo",
      `Ahorros: ${formatCurrency(values.savings ?? 0)}`,
      `Ingresos mensuales: ${formatCurrency(values.monthlyIncome ?? 0)}`,
      `Hipoteca máxima: ${formatCurrency(result.maxMortgagePrincipal)}`,
      `Precio máximo recomendado: ${formatCurrency(result.maxRecommendedPrice)}`,
      `Rango seguro: ${formatCurrency(result.safeSearchMin)} - ${formatCurrency(result.safeSearchMax)}`,
    ].join("\n"));
  }, [onSummaryChange, result.maxMortgagePrincipal, result.maxRecommendedPrice, result.safeSearchMax, result.safeSearchMin, values.monthlyIncome, values.savings]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <NumericSliderField label="Ahorros disponibles" value={values.savings ?? DEFAULTS.savings} min={0} max={500000} step={1000} prefix="€" onChange={(value) => setValue("savings", value, { shouldValidate: true })} />
        <NumericSliderField label="Ingresos netos mensuales" value={values.monthlyIncome ?? DEFAULTS.monthlyIncome} min={0} max={12000} step={100} prefix="€" onChange={(value) => setValue("monthlyIncome", value, { shouldValidate: true })} />
        <NumericSliderField label="Deudas mensuales" value={values.monthlyDebt ?? DEFAULTS.monthlyDebt} min={0} max={4000} step={50} prefix="€" onChange={(value) => setValue("monthlyDebt", value, { shouldValidate: true })} />
        <NumericSliderField label="Cuota máxima cómoda" value={values.comfortableMonthlyPayment ?? DEFAULTS.comfortableMonthlyPayment} min={0} max={5000} step={50} prefix="€" onChange={(value) => setValue("comfortableMonthlyPayment", value, { shouldValidate: true })} />
        <NumericSliderField label="Plazo" value={values.years ?? DEFAULTS.years} min={5} max={40} step={1} unit="años" onChange={(value) => setValue("years", value, { shouldValidate: true })} />
        <NumericSliderField label="Tipo interés" value={values.annualInterestRate ?? DEFAULTS.annualInterestRate} min={0} max={10} step={0.1} unit="%" onChange={(value) => setValue("annualInterestRate", value, { shouldValidate: true })} />
        <NumericSliderField label="Financiación" value={values.financingPercent ?? DEFAULTS.financingPercent} min={0} max={100} step={1} unit="%" onChange={(value) => setValue("financingPercent", value, { shouldValidate: true })} />
        <FormField label="Tipo vivienda">
          <select className="input" value={values.propertyKind ?? DEFAULTS.propertyKind} onChange={(event) => setValue("propertyKind", event.target.value as MaxBudgetFormValues["propertyKind"], { shouldValidate: true })}>
            <option value="used">Segunda mano</option>
            <option value="new">Nueva</option>
          </select>
        </FormField>
      </div>

      <ResultSummary title="Precio máximo comprador" footer={<p className="text-sm text-text-secondary">Usa este presupuesto para actualizar la solicitud y buscar propiedades compatibles en la siguiente fase.</p>}>
        <ResultRow label="Precio máximo recomendado" value={formatCurrency(result.maxRecommendedPrice)} highlight />
        <ResultRow label="Hipoteca máxima estimada" value={formatCurrency(result.maxMortgagePrincipal)} />
        <ResultRow label="Entrada necesaria" value={formatCurrency(result.requiredDownPayment)} />
        <ResultRow label="Gastos estimados" value={formatCurrency(result.estimatedCosts)} />
        <ResultRow label="Rango seguro búsqueda" value={`${formatCurrency(result.safeSearchMin)} - ${formatCurrency(result.safeSearchMax)}`} />
        <ResultRow label="Presupuesto solicitud" value={formatCurrency(result.recommendedLeadBudget)} highlight />
      </ResultSummary>
    </div>
  );
}
