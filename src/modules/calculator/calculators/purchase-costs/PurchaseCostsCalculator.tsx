"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import FormField from "../../components/FormField";
import NumericSliderField from "../../components/NumericSliderField";
import { AdvisoryNote, ResultRow, ResultSummary } from "../../components/ResultSummary";
import { formatCurrency } from "../../components/format";
import { calculatePurchaseCosts } from "../../formulas/purchaseCosts";
import { purchaseCostsSchema, type PurchaseCostsFormValues } from "../../schemas/purchase-costs.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: PurchaseCostsFormValues = {
  price: 300000,
  autonomousCommunity: "Cataluña",
  propertyKind: "used",
  hasMortgage: true,
  firstHome: false,
  buyerAge: 40,
  itpRate: 10,
  ivaRate: 10,
  ajdRate: 1.5,
  notary: 900,
  registry: 500,
  agency: 450,
  appraisal: 400,
  financingPercent: 80,
};

export default function PurchaseCostsCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue } = useForm<PurchaseCostsFormValues>({
    resolver: calculatorResolver(purchaseCostsSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const result = useMemo(() => calculatePurchaseCosts({ ...DEFAULTS, ...values }), [values]);
  const savings = (values.price ?? DEFAULTS.price) * ((100 - (values.financingPercent ?? 80)) / 100) + result.totalCosts;

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de gastos de compraventa",
      `Precio vivienda: ${formatCurrency(values.price ?? 0)}`,
      `${result.appliedTaxLabel}: ${formatCurrency(result.transferTax + result.iva)}`,
      `AJD: ${formatCurrency(result.ajd)}`,
      `Total gastos: ${formatCurrency(result.totalCosts)}`,
      `Total operación: ${formatCurrency(result.totalOperation)}`,
      `Ahorro recomendado: ${formatCurrency(savings)}`,
    ].join("\n"));
  }, [onSummaryChange, result, savings, values.price]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <NumericSliderField label="Precio vivienda" value={values.price ?? DEFAULTS.price} min={0} max={1000000} step={1000} prefix="€" onChange={(value) => setValue("price", value, { shouldValidate: true })} />
        <NumericSliderField label="Financiación" value={values.financingPercent ?? DEFAULTS.financingPercent} min={0} max={100} step={1} unit="%" onChange={(value) => setValue("financingPercent", value, { shouldValidate: true })} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Tipo vivienda">
            <select className="input" value={values.propertyKind ?? DEFAULTS.propertyKind} onChange={(event) => setValue("propertyKind", event.target.value as PurchaseCostsFormValues["propertyKind"], { shouldValidate: true })}>
              <option value="used">Segunda mano</option>
              <option value="new">Nueva</option>
            </select>
          </FormField>
          <label className="flex items-center gap-2 rounded-ds-md border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary">
            <input type="checkbox" checked={values.hasMortgage ?? DEFAULTS.hasMortgage} onChange={(event) => setValue("hasMortgage", event.target.checked, { shouldValidate: true })} />
            Compra con hipoteca
          </label>
          <CompactNumberField label="ITP" hint="%" value={values.itpRate ?? DEFAULTS.itpRate} step={0.1} onChange={(value) => setValue("itpRate", value, { shouldValidate: true })} />
          <CompactNumberField label="IVA" hint="%" value={values.ivaRate ?? DEFAULTS.ivaRate} step={0.1} onChange={(value) => setValue("ivaRate", value, { shouldValidate: true })} />
          <CompactNumberField label="AJD" hint="%" value={values.ajdRate ?? DEFAULTS.ajdRate} step={0.1} onChange={(value) => setValue("ajdRate", value, { shouldValidate: true })} />
          <CompactNumberField label="Notaría" value={values.notary ?? DEFAULTS.notary} onChange={(value) => setValue("notary", value, { shouldValidate: true })} />
          <CompactNumberField label="Registro" value={values.registry ?? DEFAULTS.registry} onChange={(value) => setValue("registry", value, { shouldValidate: true })} />
          <CompactNumberField label="Gestoría" value={values.agency ?? DEFAULTS.agency} onChange={(value) => setValue("agency", value, { shouldValidate: true })} />
          <CompactNumberField label="Tasación" value={values.appraisal ?? DEFAULTS.appraisal} onChange={(value) => setValue("appraisal", value, { shouldValidate: true })} />
        </div>
        <AdvisoryNote>Estimación orientativa. Los tipos impositivos pueden variar según comunidad autónoma y perfil.</AdvisoryNote>
      </div>

      <ResultSummary title="Gastos de compraventa">
        <ResultRow label={result.appliedTaxLabel} value={formatCurrency(result.transferTax + result.iva)} highlight />
        <ResultRow label="AJD" value={formatCurrency(result.ajd)} />
        <ResultRow label="Notaría" value={formatCurrency(result.notary)} />
        <ResultRow label="Registro" value={formatCurrency(result.registry)} />
        <ResultRow label="Gestoría" value={formatCurrency(result.agency)} />
        <ResultRow label="Tasación" value={formatCurrency(result.appraisal)} />
        <ResultRow label="Total gastos" value={formatCurrency(result.totalCosts)} highlight />
        <ResultRow label="Total operación" value={formatCurrency(result.totalOperation)} />
        <ResultRow label="Ahorro recomendado" value={formatCurrency(savings)} />
      </ResultSummary>
    </div>
  );
}
