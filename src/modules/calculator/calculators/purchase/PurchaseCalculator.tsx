"use client";

import { useEffect } from "react";
import { useForm, useWatch, type FieldPath, type FieldPathValue } from "react-hook-form";
import FormField from "../../components/FormField";
import { CalcSection } from "../../components/CalcSection";
import { CalcSliderInput } from "../../components/CalcSliderInput";
import { CalcHeroResult, type CalcStatus } from "../../components/CalcHeroResult";
import { CalcMetricTile } from "../../components/CalcMetricTile";
import { AdvisoryNote } from "../../components/ResultSummary";
import { formatCurrency, formatPercent } from "../../components/format";
import { calculateHomePurchase } from "../../formulas/purchase";
import { purchaseSchema, type PurchaseFormValues } from "../../schemas/purchase.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: PurchaseFormValues = {
  price: 300000,
  savings: 95000,
  propertyKind: "used",
  autonomousCommunity: "Cataluna",
  financingPercent: 80,
  annualInterestRate: 3.5,
  years: 30,
  monthlyIncome: 3500,
  monthlyDebt: 200,
  paymentMode: "mortgage",
  firstHome: false,
  buyerAge: 40,
};

function viabilityToStatus(v: string): CalcStatus {
  if (v === "viable") return "success";
  if (v === "tight") return "warning";
  return "danger";
}

function viabilityLabel(v: string): string {
  if (v === "viable") return "Viable";
  if (v === "tight") return "Ajustada";
  return "No viable";
}

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

  const setCurrentValue = <K extends FieldPath<PurchaseFormValues>>(
    name: K,
    value: FieldPathValue<PurchaseFormValues, K>,
  ) => setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

  useEffect(() => {
    onSummaryChange?.([
      "Simulacion de compra",
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

  const status = viabilityToStatus(result.viability);
  const heroLabel = showMortgageFields ? "Cuota mensual estimada" : "Dinero total necesario";
  const heroValue = showMortgageFields
    ? formatCurrency(result.monthlyPayment)
    : formatCurrency(result.totalNeeded);

  const debtRatioPct = result.debtRatio > 0
    ? Math.min((result.debtRatio / 50) * 100, 100)
    : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label={heroLabel}
          value={heroValue}
          status={status}
          statusLabel={viabilityLabel(result.viability)}
          secondaryLabel={showMortgageFields ? "Ratio de endeudamiento" : undefined}
          secondaryValue={result.debtRatio > 0 ? formatPercent(result.debtRatio) : undefined}
          progressValue={debtRatioPct}
          helpText={result.summary}
        />
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="Entrada necesaria" value={formatCurrency(result.requiredDownPayment)} />
          <CalcMetricTile label="Gastos estimados" value={formatCurrency(result.purchaseCosts)} />
          {result.mortgagePrincipal > 0 && (
            <CalcMetricTile label="Hipoteca estimada" value={formatCurrency(result.mortgagePrincipal)} />
          )}
          <CalcMetricTile label="Ahorro restante" value={formatCurrency(result.remainingSavings)} highlight={result.remainingSavings < 0} />
          <CalcMetricTile label="Precio max. recomendado" value={formatCurrency(result.maxRecommendedPrice)} />
          <CalcMetricTile label="Total necesario" value={formatCurrency(result.totalNeeded)} highlight />
        </div>
      </div>

      {/* Panel de inputs */}
      <div className="flex flex-col gap-4">
        <CalcSection label="La vivienda">
          <CalcSliderInput
            label="Precio de la vivienda"
            value={input.price}
            min={0}
            max={1000000}
            step={1000}
            prefix="€"
            onChange={(value) => setCurrentValue("price", value)}
            error={errors.price?.message}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo de vivienda">
              <select
                className="input"
                value={input.propertyKind}
                onChange={(e) => setCurrentValue("propertyKind", e.target.value as PurchaseFormValues["propertyKind"])}
              >
                <option value="used">Segunda mano</option>
                <option value="new">Nueva</option>
              </select>
            </FormField>
            <FormField label="Modalidad de pago">
              <select
                className="input"
                value={paymentMode}
                onChange={(e) => setCurrentValue("paymentMode", e.target.value as PurchaseFormValues["paymentMode"])}
              >
                <option value="mortgage">Hipoteca</option>
                <option value="cash">Contado</option>
                <option value="mixed">Mixto</option>
              </select>
            </FormField>
          </div>
        </CalcSection>

        <CalcSection label="Los ahorros">
          <CalcSliderInput
            label="Ahorros disponibles"
            value={input.savings}
            min={0}
            max={500000}
            step={1000}
            prefix="€"
            onChange={(value) => setCurrentValue("savings", value)}
            error={errors.savings?.message}
          />
        </CalcSection>

        {showMortgageFields && (
          <CalcSection label="La financiacion">
            <CalcSliderInput
              label={paymentMode === "mixed" ? "Parte financiada" : "Financiacion"}
              value={input.financingPercent}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(value) => setCurrentValue("financingPercent", value)}
              error={errors.financingPercent?.message}
            />
            <CalcSliderInput
              label="Tipo de interes nominal"
              value={input.annualInterestRate}
              min={0}
              max={10}
              step={0.1}
              unit="%"
              onChange={(value) => setCurrentValue("annualInterestRate", value)}
              error={errors.annualInterestRate?.message}
            />
            <CalcSliderInput
              label="Plazo"
              value={input.years}
              min={5}
              max={40}
              step={1}
              unit="anos"
              onChange={(value) => setCurrentValue("years", value)}
              error={errors.years?.message}
            />
          </CalcSection>
        )}

        {showMortgageFields && (
          <CalcSection label="Tu situacion">
            <CalcSliderInput
              label="Ingresos netos mensuales"
              value={input.monthlyIncome}
              min={0}
              max={12000}
              step={100}
              prefix="€"
              onChange={(value) => setCurrentValue("monthlyIncome", value)}
              error={errors.monthlyIncome?.message}
            />
            <CalcSliderInput
              label="Otras deudas mensuales"
              value={input.monthlyDebt}
              min={0}
              max={4000}
              step={50}
              prefix="€"
              onChange={(value) => setCurrentValue("monthlyDebt", value)}
              error={errors.monthlyDebt?.message}
            />
          </CalcSection>
        )}

        <AdvisoryNote>
          Los gastos e impuestos son orientativos. Las bonificaciones avanzadas quedan preparadas para una fase posterior.
        </AdvisoryNote>
      </div>
    </div>
  );
}
