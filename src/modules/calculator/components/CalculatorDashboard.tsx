"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import {
  Building2,
  Calculator,
  HandCoins,
  Landmark,
  LibraryBig,
  LineChart,
  Link2,
  Percent,
  PiggyBank,
  ReceiptText,
  Save,
} from "lucide-react";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import CalculatorCard from "./CalculatorCard";
import CalculatorShell from "./CalculatorShell";
import type { CalculatorConfig, CalculatorScreenProps, CalculatorType } from "../types";
import SimpleCommissionCalculator from "../calculators/simple-commission/SimpleCommissionCalculator";
import PurchaseCalculator from "../calculators/purchase/PurchaseCalculator";
import MortgageCalculator from "../calculators/mortgage/MortgageCalculator";
import PurchaseCostsCalculator from "../calculators/purchase-costs/PurchaseCostsCalculator";
import PlusvaliaCalculator from "../calculators/plusvalia/PlusvaliaCalculator";
import SellerNetCalculator from "../calculators/seller-net/SellerNetCalculator";
import InvestmentCalculator from "../calculators/investment/InvestmentCalculator";
import MaxBudgetCalculator from "../calculators/max-budget/MaxBudgetCalculator";

const CALCULATORS: CalculatorConfig[] = [
  { id: "simple_commission", title: "Calculadora simplificada", description: "Comisión rápida, precio final y neto vendedor.", badge: "Diaria", icon: Percent },
  { id: "purchase", title: "Comprar vivienda", description: "Comprueba si un cliente puede comprar una vivienda concreta.", badge: "Recomendado", icon: Building2 },
  { id: "mortgage", title: "Hipoteca", description: "Cuota, intereses, ratio y escenarios de plazo/tipo.", icon: Landmark },
  { id: "purchase_costs", title: "Gastos", description: "ITP/IVA, AJD, notaría, registro, gestoría y tasación.", icon: ReceiptText },
  { id: "plusvalia", title: "Plusvalía", description: "Estimación municipal simple y avanzada por método favorable.", icon: LibraryBig },
  { id: "seller_net", title: "Venta", description: "Neto de propietario y costes de salida para captación.", badge: "Nuevo", icon: HandCoins },
  { id: "investment", title: "Inversión", description: "Rentabilidad, cashflow, payback y precio objetivo.", icon: LineChart },
  { id: "max_budget", title: "Precio máximo", description: "Calcula hasta dónde puede llegar un comprador.", badge: "Nuevo", icon: PiggyBank },
  { id: "saved", title: "Simulaciones guardadas", description: "Arquitectura preparada para guardar y comparar escenarios.", icon: Save },
];

const COMPONENTS: Record<Exclude<CalculatorType, "saved">, { title: string; description: string; Component: ComponentType<CalculatorScreenProps> }> = {
  simple_commission: { title: "Calculadora simplificada", description: "Cálculo rápido de comisión, precio final y neto vendedor.", Component: SimpleCommissionCalculator },
  purchase: { title: "Comprar vivienda", description: "Analiza viabilidad, ahorro necesario, gastos y cuota estimada.", Component: PurchaseCalculator },
  mortgage: { title: "Hipoteca avanzada", description: "Compara cuota, intereses y sensibilidad ante plazos o tipos.", Component: MortgageCalculator },
  purchase_costs: { title: "Gastos de compraventa", description: "Desglosa impuestos y costes habituales de una compra.", Component: PurchaseCostsCalculator },
  plusvalia: { title: "Plusvalía municipal", description: "Calcula una estimación orientativa por método objetivo y real.", Component: PlusvaliaCalculator },
  seller_net: { title: "Venta de vivienda", description: "Estima cuánto dinero neto recibirá el propietario.", Component: SellerNetCalculator },
  investment: { title: "Rentabilidad inversión", description: "Calcula rentabilidad neta, cashflow y recuperación.", Component: InvestmentCalculator },
  max_budget: { title: "Precio máximo comprador", description: "Convierte capacidad económica en presupuesto comercial.", Component: MaxBudgetCalculator },
};

export default function CalculatorDashboard() {
  const [active, setActive] = useState<CalculatorType | null>(null);
  const [summary, setSummary] = useState("Selecciona una calculadora y completa los datos para copiar un resumen.");
  const selected = CALCULATORS.find((item) => item.id === active) ?? null;
  const activeMeta = active && active !== "saved" ? COMPONENTS[active] : null;
  const ActiveComponent = activeMeta?.Component ?? null;

  function selectCalculator(next: CalculatorType | null) {
    setActive(next);
    setSummary("Completa la simulación para copiar un resumen comercial.");
  }

  return (
    <div className="space-y-6">
      {active === null ? (
        <>
          <div className="rounded-ds-lg border border-border bg-surface p-6 shadow-layer-1">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Hub de herramientas</p>
                <h2 className="mt-1 text-lg font-semibold text-text-primary">Calculadora inmobiliaria</h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-secondary">
                  Simula operaciones de compra, venta, hipoteca, plusvalía y rentabilidad para tomar mejores decisiones comerciales.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={<Calculator className="h-4 w-4" />} onClick={() => selectCalculator("simple_commission")}>Comisión rápida</Button>
                <Button size="sm" variant="secondary" icon={<Save className="h-4 w-4" />} onClick={() => selectCalculator("saved")}>Guardadas</Button>
                <Button size="sm" variant="ghost" icon={<Link2 className="h-4 w-4" />} disabled>Vincular</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CALCULATORS.map((item) => (
              <CalculatorCard key={item.id} config={item} selected={selected?.id === item.id} onSelect={selectCalculator} />
            ))}
          </div>
        </>
      ) : active === "saved" ? (
        <div className="rounded-ds-lg border border-border bg-surface p-8 shadow-layer-1">
          <Button variant="secondary" size="sm" onClick={() => selectCalculator(null)}>Volver a calculadoras</Button>
          <EmptyState
            icon={<Save className="h-8 w-8" />}
            title="Simulaciones guardadas"
            description="La persistencia en base de datos se implementará en la fase 2. El contrato de tipos y servicio ya queda preparado."
          />
        </div>
      ) : ActiveComponent && activeMeta ? (
        <CalculatorShell
          title={activeMeta.title}
          description={activeMeta.description}
          onBack={() => selectCalculator(null)}
          summary={summary}
          calculatorType={active ?? undefined}
        >
          <ActiveComponent onSummaryChange={setSummary} />
        </CalculatorShell>
      ) : null}
    </div>
  );
}
