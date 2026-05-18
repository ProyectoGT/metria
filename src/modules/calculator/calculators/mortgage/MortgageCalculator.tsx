"use client";

import { useEffect } from "react";
import { useForm, useWatch, type FieldPath, type FieldPathValue } from "react-hook-form";
import CompactNumberField from "../../components/CompactNumberField";
import FormField from "../../components/FormField";
import { CalcSection } from "../../components/CalcSection";
import { CalcSliderInput } from "../../components/CalcSliderInput";
import { CalcHeroResult, type CalcStatus } from "../../components/CalcHeroResult";
import { CalcMetricTile } from "../../components/CalcMetricTile";
import ScenarioComparison from "../../components/ScenarioComparison";
import { formatCurrency, formatPercent } from "../../components/format";
import {
  calculateAdvancedMortgage,
  calculateMortgageRateScenarios,
  calculateMortgageTermScenarios,
} from "../../formulas/mortgage";
import { mortgageSchema, type MortgageFormValues } from "../../schemas/mortgage.schema";
import { calculatorResolver } from "../../schemas/resolver";
import type { CalculatorScreenProps } from "../../types";

const DEFAULTS: MortgageFormValues = {
  price: 300000,
  downPayment: 60000,
  principal: 240000,
  financingPercent: 80,
  annualInterestRate: 3.5,
  tae: 3.8,
  years: 30,
  mortgageKind: "fixed",
  monthlyIncome: 3500,
  monthlyDebt: 150,
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

export default function MortgageCalculator({ onSummaryChange }: CalculatorScreenProps) {
  const { control, setValue } = useForm<MortgageFormValues>({
    resolver: calculatorResolver(mortgageSchema),
    defaultValues: DEFAULTS,
    mode: "onChange",
  });

  const values = useWatch({ control });
  const input: MortgageFormValues = { ...DEFAULTS, ...values };
  const result = calculateAdvancedMortgage({
    propertyPrice: input.price,
    downPayment: input.downPayment,
    annualInterestRate: input.annualInterestRate,
    years: input.years,
    monthlyIncome: input.monthlyIncome,
    monthlyDebt: input.monthlyDebt,
  });
  const principal = result.financedAmount;
  const termScenarios = calculateMortgageTermScenarios({
    principal,
    annualInterestRate: input.annualInterestRate,
    years: input.years,
    monthlyIncome: input.monthlyIncome,
    monthlyDebt: input.monthlyDebt,
  });
  const rateScenarios = calculateMortgageRateScenarios({
    principal,
    annualInterestRate: input.annualInterestRate,
    years: input.years,
    monthlyIncome: input.monthlyIncome,
    monthlyDebt: input.monthlyDebt,
  });

  const setCurrentValue = <K extends FieldPath<MortgageFormValues>>(
    name: K,
    value: FieldPathValue<MortgageFormValues, K>,
  ) => setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

  const setFinancedAmount = (value: number) => {
    const financedAmount = Math.min(Math.max(value, 0), input.price);
    setCurrentValue("downPayment", input.price - financedAmount);
    setCurrentValue("principal", financedAmount);
    setCurrentValue("financingPercent", input.price > 0 ? (financedAmount / input.price) * 100 : 0);
  };

  useEffect(() => {
    onSummaryChange?.([
      "Simulacion de hipoteca",
      `Precio vivienda: ${formatCurrency(input.price)}`,
      `Entrada: ${formatCurrency(input.downPayment)}`,
      `Hipoteca: ${formatCurrency(principal)}`,
      `Plazo: ${input.years} anos`,
      `TIN: ${input.annualInterestRate.toLocaleString("es-ES")}%`,
      `Cuota estimada: ${formatCurrency(result.monthlyPayment)}/mes`,
      `Intereses totales: ${formatCurrency(result.totalInterest)}`,
    ].join("\n"));
  }, [
    input.annualInterestRate,
    input.downPayment,
    input.price,
    input.years,
    onSummaryChange,
    principal,
    result.monthlyPayment,
    result.totalInterest,
  ]);

  const status = viabilityToStatus(result.viability);
  const debtRatioPct = result.debtRatio > 0
    ? Math.min((result.debtRatio / 50) * 100, 100)
    : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Panel de resultado — mobile first */}
      <div className="order-first flex flex-col gap-4 lg:order-last lg:sticky lg:top-4 lg:self-start">
        <CalcHeroResult
          label="Cuota mensual estimada"
          value={formatCurrency(result.monthlyPayment)}
          status={status}
          statusLabel={viabilityLabel(result.viability)}
          secondaryLabel="Ratio de endeudamiento"
          secondaryValue={formatPercent(result.debtRatio)}
          progressValue={debtRatioPct}
          helpText="El ratio recomendado es inferior al 35% de los ingresos netos."
        />
        <div className="grid grid-cols-2 gap-2">
          <CalcMetricTile label="Capital financiado" value={formatCurrency(result.financedAmount)} />
          <CalcMetricTile label="Intereses totales" value={formatCurrency(result.totalInterest)} />
          <CalcMetricTile label="Total pagado" value={formatCurrency(result.totalPaid)} highlight />
          <CalcMetricTile label="Ahorro recomendado" value={formatCurrency(result.financedAmount * 0.25)} />
        </div>
        <ScenarioComparison
          columns={["Plazo", "Cuota", "Intereses"]}
          rows={termScenarios.map((scenario) => ({
            id: String(scenario.months),
            featured: scenario.months === result.months,
            cells: [
              `${scenario.months / 12} anos`,
              formatCurrency(scenario.monthlyPayment),
              formatCurrency(scenario.totalInterest),
            ],
          }))}
        />
        <ScenarioComparison
          columns={["Tipo", "Cuota", "Ratio"]}
          rows={rateScenarios.map((scenario, index) => ({
            id: `rate-${index}`,
            featured: index === 1,
            cells: [
              index === 0 ? "-0,5%" : index === 1 ? "Actual" : "+0,5%",
              formatCurrency(scenario.monthlyPayment),
              formatPercent(scenario.debtRatio),
            ],
          }))}
        />
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
            onChange={(value) => {
              setCurrentValue("price", value);
              if (input.downPayment > value) {
                setCurrentValue("downPayment", value);
              }
            }}
          />
        </CalcSection>

        <CalcSection label="La hipoteca">
          <CalcSliderInput
            label="Entrada aportada"
            value={input.downPayment}
            min={0}
            max={input.price}
            step={1000}
            prefix="€"
            onChange={(value) => setCurrentValue("downPayment", value)}
          />
          <CalcSliderInput
            label="Importe a financiar"
            value={principal}
            min={0}
            max={input.price}
            step={1000}
            prefix="€"
            onChange={setFinancedAmount}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo hipoteca">
              <select
                className="input"
                value={input.mortgageKind}
                onChange={(e) => setCurrentValue("mortgageKind", e.target.value as MortgageFormValues["mortgageKind"])}
              >
                <option value="fixed">Fija</option>
                <option value="variable">Variable</option>
                <option value="mixed">Mixta</option>
              </select>
            </FormField>
            <CompactNumberField
              label="TAE orientativa"
              value={input.tae}
              step={0.1}
              onChange={(value) => setCurrentValue("tae", value)}
            />
          </div>
          <CalcSliderInput
            label="Tipo de interes nominal"
            value={input.annualInterestRate}
            min={0}
            max={10}
            step={0.1}
            unit="%"
            onChange={(value) => setCurrentValue("annualInterestRate", value)}
          />
          <CalcSliderInput
            label="Plazo"
            value={input.years}
            min={5}
            max={40}
            step={1}
            unit="anos"
            onChange={(value) => setCurrentValue("years", value)}
          />
        </CalcSection>

        <CalcSection label="Tu situacion">
          <CalcSliderInput
            label="Ingresos mensuales netos"
            value={input.monthlyIncome}
            min={0}
            max={12000}
            step={100}
            prefix="€"
            onChange={(value) => setCurrentValue("monthlyIncome", value)}
          />
          <CalcSliderInput
            label="Deudas mensuales existentes"
            value={input.monthlyDebt}
            min={0}
            max={4000}
            step={50}
            prefix="€"
            onChange={(value) => setCurrentValue("monthlyDebt", value)}
          />
        </CalcSection>
      </div>
    </div>
  );
}
