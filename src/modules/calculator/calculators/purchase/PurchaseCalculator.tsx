"use client";

import { useEffect } from "react";
import { useForm, useWatch, type FieldPath, type FieldPathValue } from "react-hook-form";
import FormField from "../../components/FormField";
import NumericSliderField from "../../components/NumericSliderField";
import { AdvisoryNote, ResultRow, ResultSummary } from "../../components/ResultSummary";
import { formatCurrency, formatPercent } from "../../components/format";
import { ViabilityBadge } from "../../components/ViabilityBadge";
import { calculateHomePurchase } from "../../formulas/purchase";
import { purchaseSchema, type PurchaseFormValues } from "../../schemas/purchase.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: PurchaseFormValues = {
  price: 300000,
  savings: 95000,
  propertyKind: "used",
  autonomousCommunity: "Cataluña",
  financingPercent: 80,
  annualInterestRate: 3.5,
  years: 30,
  monthlyIncome: 3500,
  monthlyDebt: 200,
  paymentMode: "mortgage",
  firstHome: false,
  buyerAge: 40,
};

export default function PurchaseCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue, formState: { errors } } = useForm<PurchaseFormValues>({
    resolver: calculatorResolver(purchaseSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const input: PurchaseFormValues = { ...DEFAULTS, ...values };
  const result = calculateHomePurchase(input);
  const paymentMode = input.paymentMode;
  const showMortgageFields = paymentMode !== "cash";
  const setCurrentValue = <K extends FieldPath<PurchaseFormValues>>(name: K, value: FieldPathValue<PurchaseFormValues, K>) => {
    setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de compra",
      `Modalidad: ${paymentMode === "cash" ? "Contado" : paymentMode === "mixed" ? "Mixto" : "Hipoteca"}`,
      `Precio vivienda: ${formatCurrency(input.price)}`,
      `Ahorros: ${formatCurrency(input.savings)}`,
      `Gastos estimados: ${formatCurrency(result.purchaseCosts)}`,
      result.mortgagePrincipal > 0 ? `Hipoteca estimada: ${formatCurrency(result.mortgagePrincipal)}` : null,
      result.monthlyPayment > 0 ? `Cuota estimada: ${formatCurrency(result.monthlyPayment)}/mes` : null,
      `Total necesario: ${formatCurrency(result.totalNeeded)}`,
      `Ahorro restante: ${formatCurrency(result.remainingSavings)}`,
      `Viabilidad: ${result.viability}`,
    ].filter(Boolean).join("\n"));
  }, [
    input.price,
    input.savings,
    onSummaryChange,
    paymentMode,
    result.mortgagePrincipal,
    result.monthlyPayment,
    result.purchaseCosts,
    result.remainingSavings,
    result.totalNeeded,
    result.viability,
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <NumericSliderField
          label="Precio vivienda"
          value={input.price}
          min={0}
          max={1000000}
          step={1000}
          prefix="€"
          onChange={(value) => setCurrentValue("price", value)}
          helperText={errors.price?.message}
        />
        <NumericSliderField
          label="Ahorros disponibles"
          value={input.savings}
          min={0}
          max={500000}
          step={1000}
          prefix="€"
          onChange={(value) => setCurrentValue("savings", value)}
          helperText={errors.savings?.message}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Tipo vivienda">
            <select className="input" value={input.propertyKind} onChange={(event) => setCurrentValue("propertyKind", event.target.value as PurchaseFormValues["propertyKind"])}>
              <option value="used">Segunda mano</option>
              <option value="new">Nueva</option>
            </select>
          </FormField>
          <FormField label="Modalidad de pago">
            <select className="input" value={paymentMode} onChange={(event) => setCurrentValue("paymentMode", event.target.value as PurchaseFormValues["paymentMode"])}>
              <option value="mortgage">Hipoteca</option>
              <option value="cash">Contado</option>
              <option value="mixed">Mixto</option>
            </select>
          </FormField>
        </div>

        {showMortgageFields && (
          <>
            <NumericSliderField
              label={paymentMode === "mixed" ? "Parte financiada" : "Financiación"}
              value={input.financingPercent}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(value) => setCurrentValue("financingPercent", value)}
              helperText={errors.financingPercent?.message}
            />
            <NumericSliderField
              label="Tipo interés"
              value={input.annualInterestRate}
              min={0}
              max={10}
              step={0.1}
              unit="%"
              onChange={(value) => setCurrentValue("annualInterestRate", value)}
              helperText={errors.annualInterestRate?.message}
            />
            <NumericSliderField
              label="Plazo"
              value={input.years}
              min={5}
              max={40}
              step={1}
              unit="años"
              onChange={(value) => setCurrentValue("years", value)}
              helperText={errors.years?.message}
            />
            <NumericSliderField
              label="Ingresos netos mensuales"
              value={input.monthlyIncome}
              min={0}
              max={12000}
              step={100}
              prefix="€"
              onChange={(value) => setCurrentValue("monthlyIncome", value)}
              helperText={errors.monthlyIncome?.message}
            />
            <NumericSliderField
              label="Otras deudas mensuales"
              value={input.monthlyDebt}
              min={0}
              max={4000}
              step={50}
              prefix="€"
              onChange={(value) => setCurrentValue("monthlyDebt", value)}
              helperText={errors.monthlyDebt?.message}
            />
          </>
        )}

        <AdvisoryNote>Los gastos e impuestos son orientativos. Las bonificaciones avanzadas quedan preparadas para una fase posterior.</AdvisoryNote>
      </div>

      <PurchaseResults result={result} />
    </div>
  );
}

function PurchaseResults({ result }: { result: ReturnType<typeof calculateHomePurchase> }) {
  return (
    <ResultSummary title="Resumen de compra" footer={<p className="text-sm leading-relaxed text-text-secondary">{result.summary}</p>}>
      <div className="flex items-center justify-between rounded-ds-md bg-surface-muted px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">Viabilidad</span>
        <ViabilityBadge status={result.viability} />
      </div>
      <ResultRow label="Entrada necesaria" value={formatCurrency(result.requiredDownPayment)} />
      <ResultRow label="Gastos aproximados" value={formatCurrency(result.purchaseCosts)} />
      {result.mortgagePrincipal > 0 && <ResultRow label="Hipoteca necesaria" value={formatCurrency(result.mortgagePrincipal)} />}
      {result.monthlyPayment > 0 && <ResultRow label="Cuota estimada" value={formatCurrency(result.monthlyPayment)} highlight />}
      {result.debtRatio > 0 && <ResultRow label="Ratio endeudamiento" value={formatPercent(result.debtRatio)} />}
      <ResultRow label="Dinero total necesario" value={formatCurrency(result.totalNeeded)} highlight />
      <ResultRow label="Ahorro restante" value={formatCurrency(result.remainingSavings)} />
      <ResultRow label="Precio máximo recomendado" value={formatCurrency(result.maxRecommendedPrice)} />
    </ResultSummary>
  );
}
