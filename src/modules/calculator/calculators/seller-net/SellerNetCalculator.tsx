"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import { CalcSection } from "../../components/CalcSection";
import { CalcSliderInput } from "../../components/CalcSliderInput";
import { CalcHeroResult } from "../../components/CalcHeroResult";
import { CalcMetricTile } from "../../components/CalcMetricTile";
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
      "Simulacion de venta",
      `Precio venta: ${formatCurrency(values.salePrice ?? 0)}`,
      `Hipoteca pendiente: ${formatCurrency(values.pendingMortgage ?? 0)}`,
      `Costes venta: ${formatCurrency(result.totalSaleCosts)}`,
      `Neto propietario: ${formatCurrency(result.netForOwner)}`,
    ].join("\n"));
  }, [onSummaryChange, result.netForOwner, result.totalSaleCosts, values.pendingMortgage, values.salePrice]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label="Neto para el propietario"
          value={formatCurrency(result.netForOwner)}
          status={result.netForOwner >= 0 ? "success" : "danger"}
          secondaryLabel="Costes totales de venta"
          secondaryValue={formatCurrency(result.totalSaleCosts)}
          helpText={result.summary}
        />
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="Honorarios agencia" value={formatCurrency(result.agencyFees)} />
          <CalcMetricTile label="IVA honorarios" value={formatCurrency(result.agencyVat)} />
          <CalcMetricTile label="Precio min. recomendado" value={formatCurrency(result.minimumRecommendedPrice)} />
          <CalcMetricTile label="Margen tras hipoteca" value={formatCurrency(result.marginAfterMortgage)} highlight={result.marginAfterMortgage > 0} />
        </div>
      </div>

      {/* Panel de inputs */}
      <div className="flex flex-col gap-4">
        <CalcSection label="La venta">
          <CalcSliderInput
            label="Precio estimado de venta"
            value={values.salePrice ?? DEFAULTS.salePrice}
            min={0}
            max={1500000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("salePrice", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Hipoteca pendiente"
            value={values.pendingMortgage ?? DEFAULTS.pendingMortgage}
            min={0}
            max={800000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("pendingMortgage", value, { shouldValidate: true })}
          />
        </CalcSection>

        <CalcSection label="Honorarios de agencia">
          <CalcSliderInput
            label="Honorarios (importe fijo)"
            value={values.agencyFees ?? DEFAULTS.agencyFees}
            min={0}
            max={100000}
            step={500}
            prefix="€"
            helperText="Deja en 0 para calcular por porcentaje."
            onChange={(value) => setValue("agencyFees", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Honorarios (%)"
            value={values.agencyFeePercent ?? DEFAULTS.agencyFeePercent}
            min={0}
            max={10}
            step={0.1}
            unit="%"
            onChange={(value) => setValue("agencyFeePercent", value, { shouldValidate: true })}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">IVA sobre honorarios (21%)</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={values.includeVatOnFees ?? DEFAULTS.includeVatOnFees}
                onChange={(e) =>
                  setValue("includeVatOnFees", e.target.checked, { shouldValidate: true })
                }
              />
              <span className="text-sm text-text-primary">Incluir IVA</span>
            </label>
          </div>
        </CalcSection>

        <CalcSection label="Otros costes de salida">
          <div className="grid grid-cols-2 gap-3">
            <CompactNumberField
              label="Plusvalia estimada"
              value={values.plusvalia ?? DEFAULTS.plusvalia}
              onChange={(value) => setValue("plusvalia", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Cancelacion registral"
              value={values.mortgageCancellation ?? DEFAULTS.mortgageCancellation}
              onChange={(value) =>
                setValue("mortgageCancellation", value, { shouldValidate: true })
              }
            />
            <CompactNumberField
              label="Certificados"
              value={values.certificates ?? DEFAULTS.certificates}
              onChange={(value) => setValue("certificates", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Otros gastos"
              value={values.otherCosts ?? DEFAULTS.otherCosts}
              onChange={(value) => setValue("otherCosts", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Impuestos estimados"
              value={values.estimatedTaxes ?? DEFAULTS.estimatedTaxes}
              onChange={(value) =>
                setValue("estimatedTaxes", value, { shouldValidate: true })
              }
            />
          </div>
        </CalcSection>
      </div>
    </div>
  );
}
