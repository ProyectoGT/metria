"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import FormField from "../../components/FormField";
import { CalcSection } from "../../components/CalcSection";
import { CalcSliderInput } from "../../components/CalcSliderInput";
import { CalcHeroResult } from "../../components/CalcHeroResult";
import { CalcMetricTile } from "../../components/CalcMetricTile";
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
  autonomousCommunity: "Cataluna",
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
      "Simulacion de precio maximo",
      `Ahorros: ${formatCurrency(values.savings ?? 0)}`,
      `Ingresos mensuales: ${formatCurrency(values.monthlyIncome ?? 0)}`,
      `Hipoteca maxima: ${formatCurrency(result.maxMortgagePrincipal)}`,
      `Precio maximo recomendado: ${formatCurrency(result.maxRecommendedPrice)}`,
      `Rango seguro: ${formatCurrency(result.safeSearchMin)} - ${formatCurrency(result.safeSearchMax)}`,
    ].join("\n"));
  }, [
    onSummaryChange,
    result.maxMortgagePrincipal,
    result.maxRecommendedPrice,
    result.safeSearchMax,
    result.safeSearchMin,
    values.monthlyIncome,
    values.savings,
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label="Precio maximo recomendado"
          value={formatCurrency(result.maxRecommendedPrice)}
          status="neutral"
          secondaryLabel="Presupuesto solicitud"
          secondaryValue={formatCurrency(result.recommendedLeadBudget)}
          helpText={`Rango seguro de busqueda: ${formatCurrency(result.safeSearchMin)} — ${formatCurrency(result.safeSearchMax)}.`}
        />
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="Hipoteca maxima" value={formatCurrency(result.maxMortgagePrincipal)} />
          <CalcMetricTile label="Entrada necesaria" value={formatCurrency(result.requiredDownPayment)} />
          <CalcMetricTile label="Gastos estimados" value={formatCurrency(result.estimatedCosts)} />
          <CalcMetricTile label="Rango minimo" value={formatCurrency(result.safeSearchMin)} />
        </div>
        <p className="px-1 text-xs leading-relaxed text-text-secondary">
          Usa{" "}
          <strong className="text-text-primary">
            {formatCurrency(result.recommendedLeadBudget)}
          </strong>{" "}
          como presupuesto orientativo al registrar la solicitud del cliente.
        </p>
      </div>

      {/* Panel de inputs */}
      <div className="flex flex-col gap-4">
        <CalcSection label="Tu capacidad">
          <CalcSliderInput
            label="Ahorros disponibles"
            value={values.savings ?? DEFAULTS.savings}
            min={0}
            max={500000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("savings", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Ingresos netos mensuales"
            value={values.monthlyIncome ?? DEFAULTS.monthlyIncome}
            min={0}
            max={12000}
            step={100}
            prefix="€"
            onChange={(value) => setValue("monthlyIncome", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Deudas mensuales existentes"
            value={values.monthlyDebt ?? DEFAULTS.monthlyDebt}
            min={0}
            max={4000}
            step={50}
            prefix="€"
            onChange={(value) => setValue("monthlyDebt", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Cuota mensual comoda"
            value={values.comfortableMonthlyPayment ?? DEFAULTS.comfortableMonthlyPayment}
            min={0}
            max={5000}
            step={50}
            prefix="€"
            onChange={(value) =>
              setValue("comfortableMonthlyPayment", value, { shouldValidate: true })
            }
          />
        </CalcSection>

        <CalcSection label="La hipoteca">
          <CalcSliderInput
            label="Plazo"
            value={values.years ?? DEFAULTS.years}
            min={5}
            max={40}
            step={1}
            unit="anos"
            onChange={(value) => setValue("years", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Tipo de interes"
            value={values.annualInterestRate ?? DEFAULTS.annualInterestRate}
            min={0}
            max={10}
            step={0.1}
            unit="%"
            onChange={(value) =>
              setValue("annualInterestRate", value, { shouldValidate: true })
            }
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
        </CalcSection>

        <CalcSection label="La vivienda">
          <div>
            <FormField label="Tipo de vivienda">
              <select
                className="input"
                value={values.propertyKind ?? DEFAULTS.propertyKind}
                onChange={(e) =>
                  setValue(
                    "propertyKind",
                    e.target.value as MaxBudgetFormValues["propertyKind"],
                    { shouldValidate: true },
                  )
                }
              >
                <option value="used">Segunda mano</option>
                <option value="new">Nueva</option>
              </select>
            </FormField>
          </div>
        </CalcSection>
      </div>
    </div>
  );
}
