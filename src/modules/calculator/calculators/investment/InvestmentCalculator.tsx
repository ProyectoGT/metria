"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import { CalcSection } from "../../components/CalcSection";
import { CalcSliderInput } from "../../components/CalcSliderInput";
import { CalcHeroResult, type CalcStatus } from "../../components/CalcHeroResult";
import { CalcMetricTile } from "../../components/CalcMetricTile";
import { formatCurrency, formatPercent } from "../../components/format";
import { calculateInvestmentYield } from "../../formulas/investment";
import { investmentSchema, type InvestmentFormValues } from "../../schemas/investment.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: InvestmentFormValues = {
  purchasePrice: 180000,
  purchaseCosts: 18000,
  renovation: 12000,
  furniture: 5000,
  monthlyRent: 1100,
  annualIbi: 450,
  monthlyCommunity: 75,
  annualInsurance: 280,
  annualMaintenance: 600,
  vacancyPercent: 5,
  hasFinancing: true,
  monthlyMortgagePayment: 620,
  targetYield: 5,
};

function investmentStatusToCalcStatus(s: string): CalcStatus {
  if (s === "good") return "success";
  if (s === "tight") return "warning";
  return "danger";
}

function investmentStatusLabel(s: string): string {
  if (s === "good") return "Buena inversion";
  if (s === "tight") return "Ajustada";
  return "Debil";
}

export default function InvestmentCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue } = useForm<InvestmentFormValues>({
    resolver: calculatorResolver(investmentSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });
  const values = useWatch({ control });
  const input: InvestmentFormValues = { ...DEFAULTS, ...values };
  const result = calculateInvestmentYield({
    ...input,
    monthlyMortgagePayment: input.hasFinancing ? input.monthlyMortgagePayment : 0,
  });

  useEffect(() => {
    onSummaryChange?.([
      "Simulacion de inversion",
      `Precio compra: ${formatCurrency(input.purchasePrice)}`,
      `Alquiler mensual: ${formatCurrency(input.monthlyRent)}`,
      `Rentabilidad bruta: ${formatPercent(result.grossYield)}`,
      `Rentabilidad neta: ${formatPercent(result.netYield)}`,
      `Cashflow mensual: ${formatCurrency(result.monthlyCashflow)}`,
    ].join("\n"));
  }, [input.monthlyRent, input.purchasePrice, onSummaryChange, result.grossYield, result.monthlyCashflow, result.netYield]);

  const status = investmentStatusToCalcStatus(result.status);
  const grossPct = Math.min((result.grossYield / 15) * 100, 100);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label="Rentabilidad neta anual"
          value={formatPercent(result.netYield)}
          status={status}
          statusLabel={investmentStatusLabel(result.status)}
          secondaryLabel="Rentabilidad bruta"
          secondaryValue={formatPercent(result.grossYield)}
          progressValue={grossPct}
          helpText={`Inversion inicial de ${formatCurrency(result.initialInvestment)}. Recuperacion estimada en ${result.paybackYears.toLocaleString("es-ES", { maximumFractionDigits: 1 })} anos.`}
        />
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="Cashflow mensual" value={formatCurrency(result.monthlyCashflow)} highlight={result.monthlyCashflow > 0} />
          <CalcMetricTile label="Cashflow anual" value={formatCurrency(result.annualCashflow)} />
          <CalcMetricTile label="Inversion inicial" value={formatCurrency(result.initialInvestment)} />
          <CalcMetricTile label="Precio objetivo" value={formatCurrency(result.maxPriceForTargetYield)} />
        </div>
      </div>

      {/* Panel de inputs */}
      <div className="flex flex-col gap-4">
        <CalcSection label="La compra">
          <CalcSliderInput
            label="Precio de compra"
            value={values.purchasePrice ?? DEFAULTS.purchasePrice}
            min={0}
            max={1000000}
            step={1000}
            prefix="€"
            onChange={(value) => setValue("purchasePrice", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Gastos de compra"
            value={values.purchaseCosts ?? DEFAULTS.purchaseCosts}
            min={0}
            max={150000}
            step={500}
            prefix="€"
            onChange={(value) => setValue("purchaseCosts", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Reforma y mobiliario"
            value={(values.renovation ?? 0) + (values.furniture ?? 0)}
            min={0}
            max={150000}
            step={500}
            prefix="€"
            onChange={(value) => {
              setValue("renovation", value, { shouldValidate: true });
              setValue("furniture", 0, { shouldValidate: true });
            }}
          />
        </CalcSection>

        <CalcSection label="Los ingresos">
          <CalcSliderInput
            label="Alquiler mensual estimado"
            value={values.monthlyRent ?? DEFAULTS.monthlyRent}
            min={0}
            max={6000}
            step={50}
            prefix="€"
            onChange={(value) => setValue("monthlyRent", value, { shouldValidate: true })}
          />
          <CalcSliderInput
            label="Vacancia estimada"
            value={values.vacancyPercent ?? DEFAULTS.vacancyPercent}
            min={0}
            max={30}
            step={1}
            unit="%"
            onChange={(value) => setValue("vacancyPercent", value, { shouldValidate: true })}
          />
        </CalcSection>

        <CalcSection label="Los gastos">
          <div className="grid grid-cols-2 gap-3">
            <CompactNumberField
              label="IBI anual"
              value={values.annualIbi ?? DEFAULTS.annualIbi}
              onChange={(value) => setValue("annualIbi", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Comunidad mensual"
              value={values.monthlyCommunity ?? DEFAULTS.monthlyCommunity}
              onChange={(value) => setValue("monthlyCommunity", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Seguro anual"
              value={values.annualInsurance ?? DEFAULTS.annualInsurance}
              onChange={(value) => setValue("annualInsurance", value, { shouldValidate: true })}
            />
            <CompactNumberField
              label="Mantenimiento anual"
              value={values.annualMaintenance ?? DEFAULTS.annualMaintenance}
              onChange={(value) => setValue("annualMaintenance", value, { shouldValidate: true })}
            />
          </div>
        </CalcSection>

        <CalcSection label="Financiacion">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Tiene financiacion hipotecaria</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={values.hasFinancing ?? DEFAULTS.hasFinancing}
                onChange={(e) =>
                  setValue("hasFinancing", e.target.checked, { shouldValidate: true })
                }
              />
              <span className="text-sm text-text-primary">
                {values.hasFinancing ? "Si" : "No"}
              </span>
            </label>
          </div>
          {values.hasFinancing && (
            <CalcSliderInput
              label="Cuota hipotecaria mensual"
              value={values.monthlyMortgagePayment ?? DEFAULTS.monthlyMortgagePayment}
              min={0}
              max={4000}
              step={25}
              prefix="€"
              onChange={(value) =>
                setValue("monthlyMortgagePayment", value, { shouldValidate: true })
              }
            />
          )}
        </CalcSection>
      </div>
    </div>
  );
}
