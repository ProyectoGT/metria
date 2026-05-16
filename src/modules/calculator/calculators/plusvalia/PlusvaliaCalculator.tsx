"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import FormField from "../../components/FormField";
import NumericSliderField from "../../components/NumericSliderField";
import { AdvisoryNote, ResultRow, ResultSummary } from "../../components/ResultSummary";
import { formatCurrency } from "../../components/format";
import { calculatePlusvaliaEstimate } from "../../formulas/plusvalia";
import { plusvaliaSchema, type PlusvaliaFormValues } from "../../schemas/plusvalia.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: PlusvaliaFormValues = {
  mode: "simple",
  municipality: "Barcelona",
  purchaseDate: "2016-01-01",
  saleDate: "2026-01-01",
  landCadastralValue: 90000,
  purchasePrice: 220000,
  salePrice: 300000,
  municipalCoefficient: 0.08,
  landPercentage: 100,
  taxRate: 30,
  bonusPercent: 0,
};

export default function PlusvaliaCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue, formState: { errors } } = useForm<PlusvaliaFormValues>({
    resolver: calculatorResolver(plusvaliaSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const result = useMemo(() => calculatePlusvaliaEstimate({ ...DEFAULTS, ...values }), [values]);
  const advanced = values.mode === "advanced";

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de plusvalía municipal",
      `Municipio: ${values.municipality ?? "-"}`,
      `Precio compra: ${formatCurrency(values.purchasePrice ?? 0)}`,
      `Precio venta: ${formatCurrency(values.salePrice ?? 0)}`,
      `Método recomendado: ${result.recommendedMethod === "real" ? "Real" : "Objetivo"}`,
      `Estimación: ${formatCurrency(result.estimatedAmount)}`,
    ].join("\n"));
  }, [onSummaryChange, result.estimatedAmount, result.recommendedMethod, values.municipality, values.purchasePrice, values.salePrice]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Modo">
            <select className="input" value={values.mode ?? DEFAULTS.mode} onChange={(event) => setValue("mode", event.target.value as PlusvaliaFormValues["mode"], { shouldValidate: true })}>
              <option value="simple">Simple</option>
              <option value="advanced">Avanzado</option>
            </select>
          </FormField>
          <FormField label="Municipio">
            <input className="input" value={values.municipality ?? DEFAULTS.municipality} onChange={(event) => setValue("municipality", event.target.value, { shouldValidate: true })} />
          </FormField>
          <FormField label="Fecha compra">
            <input className="input" type="date" value={values.purchaseDate ?? DEFAULTS.purchaseDate} onChange={(event) => setValue("purchaseDate", event.target.value, { shouldValidate: true })} />
          </FormField>
          <FormField label="Fecha venta" error={errors.saleDate?.message}>
            <input className="input" type="date" value={values.saleDate ?? DEFAULTS.saleDate} onChange={(event) => setValue("saleDate", event.target.value, { shouldValidate: true })} />
          </FormField>
        </div>
        <NumericSliderField label="Valor catastral suelo" value={values.landCadastralValue ?? DEFAULTS.landCadastralValue} min={0} max={500000} step={1000} prefix="€" onChange={(value) => setValue("landCadastralValue", value, { shouldValidate: true })} />
        <NumericSliderField label="Precio compra" value={values.purchasePrice ?? DEFAULTS.purchasePrice} min={0} max={1500000} step={1000} prefix="€" onChange={(value) => setValue("purchasePrice", value, { shouldValidate: true })} />
        <NumericSliderField label="Precio venta" value={values.salePrice ?? DEFAULTS.salePrice} min={0} max={1500000} step={1000} prefix="€" onChange={(value) => setValue("salePrice", value, { shouldValidate: true })} />
        {advanced && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CompactNumberField label="Coeficiente municipal" value={values.municipalCoefficient ?? DEFAULTS.municipalCoefficient} step={0.01} onChange={(value) => setValue("municipalCoefficient", value, { shouldValidate: true })} />
            <CompactNumberField label="Porcentaje suelo" hint="%" value={values.landPercentage ?? DEFAULTS.landPercentage} onChange={(value) => setValue("landPercentage", value, { shouldValidate: true })} />
            <CompactNumberField label="Tipo gravamen" hint="%" value={values.taxRate ?? DEFAULTS.taxRate} onChange={(value) => setValue("taxRate", value, { shouldValidate: true })} />
            <CompactNumberField label="Bonificación" hint="%" value={values.bonusPercent ?? DEFAULTS.bonusPercent} onChange={(value) => setValue("bonusPercent", value, { shouldValidate: true })} />
          </div>
        )}
        <AdvisoryNote>Cálculo orientativo. La cuota definitiva depende de ordenanzas municipales y revisión profesional.</AdvisoryNote>
      </div>

      <div className="space-y-4">
        <ResultSummary title="Estimación de plusvalía">
          <ResultRow label="Método recomendado" value={result.recommendedMethod === "real" ? "Real" : "Objetivo"} highlight />
          <ResultRow label="Método objetivo" value={formatCurrency(result.objectiveEstimate)} />
          <ResultRow label="Método real" value={formatCurrency(result.realEstimate)} />
          <ResultRow label="Estimación plusvalía" value={formatCurrency(result.estimatedAmount)} highlight />
          <ResultRow label="Años de tenencia" value={String(result.yearsHeld)} />
        </ResultSummary>
        {!result.isValidDateRange && <p className="rounded-ds-md bg-danger-soft px-4 py-3 text-xs font-medium text-danger">La fecha de venta debe ser posterior a la compra.</p>}
      </div>
    </div>
  );
}
