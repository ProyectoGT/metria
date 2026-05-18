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
      "Simulacion de plusvalia municipal",
      `Municipio: ${values.municipality ?? "-"}`,
      `Precio compra: ${formatCurrency(values.purchasePrice ?? 0)}`,
      `Precio venta: ${formatCurrency(values.salePrice ?? 0)}`,
      `Metodo recomendado: ${result.recommendedMethod === "real" ? "Real" : "Objetivo"}`,
      `Estimacion: ${formatCurrency(result.estimatedAmount)}`,
    ].join("\n"));
  }, [
    onSummaryChange,
    result.estimatedAmount,
    result.recommendedMethod,
    values.municipality,
    values.purchasePrice,
    values.salePrice,
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label="Estimacion de plusvalia municipal"
          value={formatCurrency(result.estimatedAmount)}
          status="neutral"
          secondaryLabel="Metodo recomendado"
          secondaryValue={result.recommendedMethod === "real" ? "Metodo real" : "Metodo objetivo"}
          helpText={
            result.isValidDateRange
              ? `Tenencia de ${result.yearsHeld} ${result.yearsHeld === 1 ? "ano" : "anos"}.`
              : undefined
          }
        />
        {!result.isValidDateRange && (
          <p className="rounded-ds-md bg-danger-soft px-4 py-3 text-xs font-medium text-danger">
            La fecha de venta debe ser posterior a la de compra.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="Metodo objetivo" value={formatCurrency(result.objectiveEstimate)} />
          <CalcMetricTile label="Metodo real" value={formatCurrency(result.realEstimate)} />
          <CalcMetricTile label="Anos de tenencia" value={`${result.yearsHeld} anos`} />
          <CalcMetricTile label="Estimacion final" value={formatCurrency(result.estimatedAmount)} highlight />
        </div>
        <p className="px-1 text-xs leading-relaxed text-text-secondary">
          Se aplica el metodo mas favorable para el contribuyente:{" "}
          <strong className="text-text-primary">
            {result.recommendedMethod === "real" ? "real" : "objetivo"}
          </strong>.
        </p>
      </div>

      {/* Panel de inputs */}
      <div className="flex flex-col gap-4">
        <CalcSection label="La operacion">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Modo de calculo">
              <select
                className="input"
                value={values.mode ?? DEFAULTS.mode}
                onChange={(e) =>
                  setValue("mode", e.target.value as PlusvaliaFormValues["mode"], {
                    shouldValidate: true,
                  })
                }
              >
                <option value="simple">Simple</option>
                <option value="advanced">Avanzado</option>
              </select>
            </FormField>
            <FormField label="Municipio">
              <input
                className="input"
                value={values.municipality ?? DEFAULTS.municipality}
                onChange={(e) =>
                  setValue("municipality", e.target.value, { shouldValidate: true })
                }
              />
            </FormField>
            <FormField label="Fecha de compra">
              <input
                className="input"
                type="date"
                value={values.purchaseDate ?? DEFAULTS.purchaseDate}
                onChange={(e) =>
                  setValue("purchaseDate", e.target.value, { shouldValidate: true })
                }
              />
            </FormField>
            <FormField label="Fecha de venta" error={errors.saleDate?.message}>
              <input
                className="input"
                type="date"
                value={values.saleDate ?? DEFAULTS.saleDate}
                onChange={(e) =>
                  setValue("saleDate", e.target.value, { shouldValidate: true })
                }
              />
            </FormField>
          </div>
        </CalcSection>

        <CalcSection label="El inmueble">
          <CalcSliderInput
            label="Valor catastral del suelo"
            value={values.landCadastralValue ?? DEFAULTS.landCadastralValue}
            min={0}
            max={500000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("landCadastralValue", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Precio de compra"
            value={values.purchasePrice ?? DEFAULTS.purchasePrice}
            min={0}
            max={1500000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("purchasePrice", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Precio de venta"
            value={values.salePrice ?? DEFAULTS.salePrice}
            min={0}
            max={1500000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("salePrice", value, { shouldValidate: true })}
          />
        </CalcSection>

        {advanced && (
          <CalcSection label="Parametros avanzados">
            <div className="grid grid-cols-2 gap-3">
              <CompactNumberField
                label="Coef. municipal"
                value={values.municipalCoefficient ?? DEFAULTS.municipalCoefficient}
                step={0.01}
                onChange={(value) =>
                  setValue("municipalCoefficient", value, { shouldValidate: true })
                }
              />
              <CompactNumberField
                label="% suelo"
                hint="%"
                value={values.landPercentage ?? DEFAULTS.landPercentage}
                onChange={(value) =>
                  setValue("landPercentage", value, { shouldValidate: true })
                }
              />
              <CompactNumberField
                label="Tipo gravamen"
                hint="%"
                value={values.taxRate ?? DEFAULTS.taxRate}
                onChange={(value) => setValue("taxRate", value, { shouldValidate: true })}
              />
              <CompactNumberField
                label="Bonificacion"
                hint="%"
                value={values.bonusPercent ?? DEFAULTS.bonusPercent}
                onChange={(value) =>
                  setValue("bonusPercent", value, { shouldValidate: true })
                }
              />
            </div>
          </CalcSection>
        )}

        <AdvisoryNote>
          Calculo orientativo por el metodo objetivo (RDL 26/2021). La cuota definitiva depende de ordenanzas municipales.
        </AdvisoryNote>
      </div>
    </div>
  );
}
