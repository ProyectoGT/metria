import {
  Building2,
  HandCoins,
  Landmark,
  LibraryBig,
  LineChart,
  Percent,
  PiggyBank,
  ReceiptText,
  DollarSign,
  BarChart3,
  FileCheck,
} from "lucide-react";
import type { CalculatorType, CalculatorConfig, CalculatorCategory, CalculatorCategoryId } from "../types";

const CATEGORIES: CalculatorCategory[] = [
  { id: "purchase_sale", label: "Compra y venta", icon: Building2 },
  { id: "financing", label: "Financiación", icon: DollarSign },
  { id: "investment", label: "Inversión", icon: BarChart3 },
  { id: "taxes", label: "Impuestos", icon: FileCheck },
];

const CALCULATORS: CalculatorConfig[] = [
  { id: "simple_commission", title: "Calculadora simplificada", description: "Comisión rápida, precio final y neto vendedor.", badge: "Diaria", icon: Percent, category: "purchase_sale", tags: ["comisión", "rápida"] },
  { id: "purchase", title: "Comprar vivienda", description: "Comprueba si un cliente puede comprar una vivienda concreta.", badge: "Recomendado", icon: Building2, category: "purchase_sale", tags: ["compra", "viabilidad"] },
  { id: "mortgage", title: "Hipoteca", description: "Cuota, intereses, ratio y escenarios de plazo/tipo.", icon: Landmark, category: "financing", tags: ["hipoteca", "cuota"] },
  { id: "purchase_costs", title: "Gastos", description: "ITP/IVA, AJD, notaría, registro, gestoría y tasación.", icon: ReceiptText, category: "taxes", tags: ["gastos", "ITP", "IVA"] },
  { id: "plusvalia", title: "Plusvalía", description: "Estimación municipal simple y avanzada por método favorable.", icon: LibraryBig, category: "taxes", tags: ["plusvalía", "municipal"] },
  { id: "seller_net", title: "Venta", description: "Neto de propietario y costes de salida para captación.", badge: "Nuevo", icon: HandCoins, category: "purchase_sale", tags: ["venta", "neto"] },
  { id: "investment", title: "Inversión", description: "Rentabilidad, cashflow, payback y precio objetivo.", icon: LineChart, category: "investment", tags: ["rentabilidad", "inversión"] },
  { id: "max_budget", title: "Precio máximo", description: "Calcula hasta dónde puede llegar un comprador.", badge: "Nuevo", icon: PiggyBank, category: "financing", tags: ["presupuesto", "comprador"] },
];

export function useCalculatorConfig() {
  function getByCategory(categoryId: CalculatorCategoryId) {
    return CALCULATORS.filter((c) => c.category === categoryId);
  }

  function getById(id: CalculatorType) {
    return CALCULATORS.find((c) => c.id === id) ?? null;
  }

  function search(query: string) {
    const q = query.toLowerCase();
    return CALCULATORS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  return { CALCULATORS, CATEGORIES, getByCategory, getById, search };
}
