"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import NumericSliderField from "../../components/NumericSliderField";
import { ResultRow, ResultSummary } from "../../components/ResultSummary";
import { formatCurrency } from "../../components/format";
import { calculateSellerNet } from "../../formulas/sellerNet";
import { sellerNetSchema, type SellerNetFormValues } from "../../schemas/seller-net.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: SellerNetFormValues = {
  salePrice: 300000,
  pendingMortgage: 90000,
  agencyFees: 0,
  agencyFeePercent: 5,
  includeVatOnFees: true,
  plusvalia: 3500,
  mortgageCancellation: 700,
  certificates: 350,
  otherCosts: 0,
  estimatedTaxes: 0,
};

export default function SellerNetCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue } = useForm<SellerNetFormValues>({
    resolver: calculatorResolver(sellerNetSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const result = useMemo(() => calculateSellerNet({ ...DEFAULTS, ...values }), [values]);

  useEffect(() => {
    onSummaryChange?.([
      "Simulación de venta",
      `Precio venta: ${formatCurrency(values.salePrice ?? 0)}`,
      `Hipoteca pendiente: ${formatCurrency(values.pendingMortgage ?? 0)}`,
      `Costes venta: ${formatCurrency(result.totalSaleCosts)}`,
      `Neto propietario: ${formatCurrency(result.netForOwner)}`,
    ].join("\n"));
  }, [onSummaryChange, result.netForOwner, result.totalSaleCosts, values.pendingMortgage, values.salePrice]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 rounded-ds-lg border border-border bg-surface p-5 shadow-layer-1">
        <NumericSliderField label="Precio estimado de venta" value={values.salePrice ?? DEFAULTS.salePrice} min={0} max={1500000} step={1000} prefix="€" onChange={(value) => setValue("salePrice", value, { shouldValidate: true })} />
        <NumericSliderField label="Hipoteca pendiente" value={values.pendingMortgage ?? DEFAULTS.pendingMortgage} min={0} max={800000} step={1000} prefix="€" onChange={(value) => setValue("pendingMortgage", value, { shouldValidate: true })} />
        <NumericSliderField label="Honorarios agencia" value={values.agencyFees ?? DEFAULTS.agencyFees} min={0} max={100000} step={500} prefix="€" onChange={(value) => setValue("agencyFees", value, { shouldValidate: true })} helperText="Déjalo en 0 para calcular por porcentaje." />
        <NumericSliderField label="Honorarios" value={values.agencyFeePercent ?? DEFAULTS.agencyFeePercent} min={0} max={10} step={0.1} unit="%" onChange={(value) => setValue("agencyFeePercent", value, { shouldValidate: true })} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CompactNumberField label="Plusvalía estimada" value={values.plusvalia ?? DEFAULTS.plusvalia} onChange={(value) => setValue("plusvalia", value, { shouldValidate: true })} />
          <CompactNumberField label="Cancelación registral" value={values.mortgageCancellation ?? DEFAULTS.mortgageCancellation} onChange={(value) => setValue("mortgageCancellation", value, { shouldValidate: true })} />
          <CompactNumberField label="Certificados" value={values.certificates ?? DEFAULTS.certificates} onChange={(value) => setValue("certificates", value, { shouldValidate: true })} />
          <CompactNumberField label="Otros gastos" value={values.otherCosts ?? DEFAULTS.otherCosts} onChange={(value) => setValue("otherCosts", value, { shouldValidate: true })} />
          <CompactNumberField label="Impuestos estimados" value={values.estimatedTaxes ?? DEFAULTS.estimatedTaxes} onChange={(value) => setValue("estimatedTaxes", value, { shouldValidate: true })} />
          <label className="flex items-center gap-2 rounded-ds-md border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary">
            <input type="checkbox" checked={values.includeVatOnFees ?? DEFAULTS.includeVatOnFees} onChange={(event) => setValue("includeVatOnFees", event.target.checked, { shouldValidate: true })} />
            IVA en honorarios
          </label>
        </div>
      </div>

      <ResultSummary title="Neto para propietario" footer={<p className="text-sm text-text-secondary">{result.summary}</p>}>
        <ResultRow label="Honorarios agencia" value={formatCurrency(result.agencyFees)} />
        <ResultRow label="IVA honorarios" value={formatCurrency(result.agencyVat)} />
        <ResultRow label="Costes totales venta" value={formatCurrency(result.totalSaleCosts)} highlight />
        <ResultRow label="Neto propietario" value={formatCurrency(result.netForOwner)} highlight />
        <ResultRow label="Precio mínimo recomendado" value={formatCurrency(result.minimumRecommendedPrice)} />
        <ResultRow label="Margen tras hipoteca" value={formatCurrency(result.marginAfterMortgage)} />
      </ResultSummary>
    </div>
  );
}
