"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import FormField from "../../components/FormField";
import { CalcSection } from "../../components/CalcSection";
import { CalcSliderInput } from "../../components/CalcSliderInput";
import { CalcHeroResult } from "../../components/CalcHeroResult";
import { CalcMetricTile } from "../../components/CalcMetricTile";
import { AdvisoryNote } from "../../components/ResultSummary";
import { formatCurrency } from "../../components/format";
import { calculatePurchaseCosts } from "../../formulas/purchaseCosts";
import { purchaseCostsSchema, type PurchaseCostsFormValues } from "../../schemas/purchase-costs.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: PurchaseCostsFormValues = {
  price: 300000,
  autonomousCommunity: "Cataluna",
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
  const savings =
    (values.price ?? DEFAULTS.price) * ((100 - (values.financingPercent ?? 80)) / 100) +
    result.totalCosts;

  useEffect(() => {
    onSummaryChange?.([
      "Simulacion de gastos de compraventa",
      `Precio vivienda: ${formatCurrency(values.price ?? 0)}`,
      `${result.appliedTaxLabel}: ${formatCurrency(result.transferTax + result.iva)}`,
      `AJD: ${formatCurrency(result.ajd)}`,
      `Total gastos: ${formatCurrency(result.totalCosts)}`,
      `Total operacion: ${formatCurrency(result.totalOperation)}`,
      `Ahorro recomendado: ${formatCurrency(savings)}`,
    ].join("\n"));
  }, [onSummaryChange, result, savings, values.price]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label="Total de gastos estimados"
          value={formatCurrency(result.totalCosts)}
          status="neutral"
          secondaryLabel={result.appliedTaxLabel}
          secondaryValue={formatCurrency(result.transferTax + result.iva)}
          helpText={`Sobre una vivienda de ${formatCurrency(values.price ?? DEFAULTS.price)}, los gastos representan el ${result.totalCosts > 0 && (values.price ?? DEFAULTS.price) > 0 ? ((result.totalCosts / (values.price ?? DEFAULTS.price)) * 100).toFixed(1) : "0"}% del precio.`}
        />
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="AJD" value={formatCurrency(result.ajd)} />
          <CalcMetricTile label="Notaria + Registro" value={formatCurrency(result.notary + result.registry)} />
          <CalcMetricTile label="Gestoria + Tasacion" value={formatCurrency(result.agency + result.appraisal)} />
          <CalcMetricTile label="Ahorro recomendado" value={formatCurrency(savings)} highlight />
        </div>
        <p className="px-1 text-xs leading-relaxed text-text-secondary">
          El total de la operacion asciende a{" "}
          <strong className="text-text-primary">{formatCurrency(result.totalOperation)}</strong>.
          Necesitas tener ahorrado al menos{" "}
          <strong className="text-text-primary">{formatCurrency(savings)}</strong> para cubrir la entrada y los gastos.
        </p>
      </div>

      {/* Panel de inputs */}
      <div className="flex flex-col gap-4">
        <CalcSection label="La vivienda">
          <CalcSliderInput
            label="Precio de compra"
            value={values.price ?? DEFAULTS.price}
            min={0}
            max={1000000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("price", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Financiacion solicitada"
            value={values.financingPercent ?? DEFAULTS.financingPercent}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(value) => setValue("financingPercent", value, { shouldValidate: true })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo de vivienda">
              <select
                className="input"
                value={values.propertyKind ?? DEFAULTS.propertyKind}
                onChange={(e) =>
                  setValue("propertyKind", e.target.value as PurchaseCostsFormValues["propertyKind"], {
                    shouldValidate: true,
                  })
                }
              >
                <option value="used">Segunda mano</option>
                <option value="new">Nueva</option>
              </select>
            </FormField>
            <label className="flex items-center gap-2 rounded-ds-md border border-border bg-surface-muted px-3 py-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={values.hasMortgage ?? DEFAULTS.hasMortgage}
                onChange={(e) =>
                  setValue("hasMortgage", e.target.checked, { shouldValidate: true })
                }
              />
              Con hipoteca
            </label>
          </div>
        </CalcSection>

        <CalcSection label="Impuestos">
          <div className="grid grid-cols-3 gap-3">
            <CompactNumberField
              label="ITP"
              hint="%"
              value={values.itpRate ?? DEFAULTS.itpRate}
              step={0.1}
              onChange={(value) => setValue("itpRate", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="IVA"
              hint="%"
              value={values.ivaRate ?? DEFAULTS.ivaRate}
              step={0.1}
              onChange={(value) => setValue("ivaRate", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="AJD"
              hint="%"
              value={values.ajdRate ?? DEFAULTS.ajdRate}
              step={0.1}
              onChange={(value) => setValue("ajdRate", value, { shouldValidate: true })}
            />
          </div>
        </CalcSection>

        <CalcSection label="Costes fijos">
          <div className="grid grid-cols-2 gap-3">
            <CompactNumberField
              label="Notaria"
              value={values.notary ?? DEFAULTS.notary}
              onChange={(value) => setValue("notary", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Registro"
              value={values.registry ?? DEFAULTS.registry}
              onChange={(value) => setValue("registry", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Gestoria"
              value={values.agency ?? DEFAULTS.agency}
              onChange={(value) => setValue("agency", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Tasacion"
              value={values.appraisal ?? DEFAULTS.appraisal}
              onChange={(value) => setValue("appraisal", value, { shouldValidate: true })}
            />
          </div>
        </CalcSection>

        <AdvisoryNote>
          Estimacion orientativa. Los tipos impositivos pueden variar segun comunidad autonoma y perfil del comprador.
        </AdvisoryNote>
      </div>
    </div>
  );
}
