"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { ComponentType } from "react";
import {
  Search,
  SlidersHorizontal,
  Building2,
  DollarSign,
  BarChart3,
  FileCheck,
  Calculator,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/ui/button";
import CalculatorShell from "./CalculatorShell";
import CalculatorCard from "./CalculatorCard";
import QuickCommissionWidget from "./widgets/QuickCommissionWidget";
import LastSimulationWidget from "./widgets/LastSimulationWidget";
import MonthStatsWidget from "./widgets/MonthStatsWidget";
import SavedSimulationsTable from "./widgets/SavedSimulationsTable";
import { useCalculatorConfig } from "../hooks/use-calculator-config";
import { useCalculatorStats } from "../hooks/use-calculator-stats";
import FilterSearch from "@/components/ui/filters/FilterSearch";
import { cn } from "@/lib/design-system";
import type { CalculatorScreenProps, CalculatorType, CalculatorCategoryId } from "../types";
import SimpleCommissionCalculator from "../calculators/simple-commission/SimpleCommissionCalculator";
import PurchaseCalculator from "../calculators/purchase/PurchaseCalculator";
import MortgageCalculator from "../calculators/mortgage/MortgageCalculator";
import PurchaseCostsCalculator from "../calculators/purchase-costs/PurchaseCostsCalculator";
import PlusvaliaCalculator from "../calculators/plusvalia/PlusvaliaCalculator";
import SellerNetCalculator from "../calculators/seller-net/SellerNetCalculator";
import InvestmentCalculator from "../calculators/investment/InvestmentCalculator";
import MaxBudgetCalculator from "../calculators/max-budget/MaxBudgetCalculator";

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

const CATEGORY_META: Record<CalculatorCategoryId, { label: string; icon: typeof Building2 }> = {
  purchase_sale: { label: "Compra y venta", icon: Building2 },
  financing: { label: "Financiación", icon: DollarSign },
  investment: { label: "Inversión", icon: BarChart3 },
  taxes: { label: "Impuestos", icon: FileCheck },
};

const CATEGORY_ORDER: CalculatorCategoryId[] = ["purchase_sale", "financing", "investment", "taxes"];

export default function CalculatorDashboard() {
  const [active, setActive] = useState<CalculatorType | null>(null);
  const [summary, setSummary] = useState("Selecciona una calculadora y completa los datos para copiar un resumen.");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CalculatorCategoryId | null>(null);
  const [showWidgets, setShowWidgets] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const { CALCULATORS, search: searchCalcs } = useCalculatorConfig();
  const { isFavorite, trackOpen, toggleFavorite, getUsageCount } = useCalculatorStats();

  const activeMeta = active && active !== "saved" ? COMPONENTS[active] : null;
  const ActiveComponent = activeMeta?.Component ?? null;

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && active === null) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [active]);

  const filteredCalcs = useMemo(() => {
    let result = CALCULATORS;
    if (search) {
      result = searchCalcs(search);
    }
    if (categoryFilter) {
      result = result.filter((c) => c.category === categoryFilter);
    }
    return result;
  }, [CALCULATORS, search, categoryFilter, searchCalcs]);

  const groupedCalcs = useMemo(() => {
    const groups: Record<CalculatorCategoryId, typeof CALCULATORS> = {
      purchase_sale: [],
      financing: [],
      investment: [],
      taxes: [],
    };
    for (const c of filteredCalcs) {
      groups[c.category]?.push(c);
    }
    return groups;
  }, [filteredCalcs]);

  function selectCalculator(next: CalculatorType | null) {
    if (next) trackOpen(next);
    setActive(next);
    setSummary("Completa la simulación para copiar un resumen comercial.");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCategoryFilter(null);
  }

  const hasActiveFilter = search || categoryFilter;
  const hasResults = filteredCalcs.length > 0;

  // Detail view for an active calculator
  if (active !== null && ActiveComponent && activeMeta) {
    return (
      <CalculatorShell
        title={activeMeta.title}
        description={activeMeta.description}
        onBack={() => selectCalculator(null)}
        summary={summary}
        calculatorType={active ?? undefined}
      >
        <ActiveComponent onSummaryChange={setSummary} />
      </CalculatorShell>
    );
  }

  // Dashboard view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Hub de herramientas</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">Calculadora inmobiliaria</h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              Simula operaciones de compra, venta, hipoteca, plusvalía y rentabilidad.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" icon={<Calculator className="h-4 w-4" />} onClick={() => selectCalculator("simple_commission")}>
              Comisión rápida
            </Button>
            <Button size="sm" variant="secondary" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setShowWidgets((v) => !v)}>
              {showWidgets ? "Ocultar widgets" : "Mostrar widgets"}
            </Button>
          </div>
        </div>

        {/* Search + Category filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <FilterSearch
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar calculadora... (/)"
              className="w-full"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                categoryFilter === null
                  ? "bg-primary text-white"
                  : "bg-muted text-text-secondary hover:bg-state-hover hover:text-text-primary",
              )}
            >
              Todas
            </button>
            {CATEGORY_ORDER.map((catId) => {
              const meta = CATEGORY_META[catId];
              const Icon = meta.icon;
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === catId ? null : catId)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    categoryFilter === catId
                      ? "bg-primary text-white"
                      : "bg-muted text-text-secondary hover:bg-state-hover hover:text-text-primary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Widgets row */}
      <AnimatePresence>
        {showWidgets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <QuickCommissionWidget onOpenCalculator={selectCalculator} />
              <LastSimulationWidget />
              <MonthStatsWidget />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calculator grid by category */}
      {!hasActiveFilter && !hasResults && (
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-8 text-center">
          <Calculator className="h-8 w-8 mx-auto text-text-secondary/40 mb-3" />
          <p className="text-sm font-semibold text-text-primary">Selecciona una calculadora</p>
          <p className="mt-1 text-sm text-text-secondary">Usa el buscador o explora las categorías</p>
        </div>
      )}

      {hasActiveFilter && !hasResults && (
        <div className="rounded-2xl border border-dashed border-border bg-surface-elevated p-8 text-center">
          <Search className="h-8 w-8 mx-auto text-text-secondary/40 mb-3" />
          <p className="text-sm font-semibold text-text-primary">Sin resultados</p>
          <p className="mt-1 text-sm text-text-secondary">Prueba con otros términos de búsqueda</p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((catId) => {
            const calcs = groupedCalcs[catId];
            if (!calcs || calcs.length === 0) return null;
            const meta = CATEGORY_META[catId];
            const Icon = meta.icon;

            return (
              <div key={catId}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-text-primary">{meta.label}</h3>
                  <span className="text-xs text-text-secondary/60">({calcs.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {calcs.map((item) => (
                    <CalculatorCard
                      key={item.id}
                      config={item}
                      isFavorite={isFavorite(item.id)}
                      usageCount={getUsageCount(item.id)}
                      onSelect={selectCalculator}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Saved simulations table */}
      <SavedSimulationsTable searchQuery={search} onOpenCalculator={selectCalculator} />
    </div>
  );
}
