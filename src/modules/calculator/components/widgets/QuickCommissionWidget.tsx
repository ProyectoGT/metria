"use client";

import { useMemo, useState } from "react";
import { Percent, Copy, Check } from "lucide-react";
import { calculateCommission } from "../../formulas/commission";
import { clamp, isValidNumberInput, parseNumberInput } from "../../formulas/number";
import { formatCurrency } from "../format";
import { cn } from "@/lib/design-system";
import type { CalculatorType } from "../../types";
import { useLocalSimulations } from "../../hooks/use-local-simulations";

type Props = {
  onOpenCalculator?: (id: CalculatorType) => void;
};

export default function QuickCommissionWidget({ onOpenCalculator }: Props) {
  const [price, setPrice] = useState(300000);
  const [pct, setPct] = useState(5);
  const [pctText, setPctText] = useState("5");
  const [pctError, setPctError] = useState(false);
  const [copied, setCopied] = useState(false);
  const { save } = useLocalSimulations();

  const result = useMemo(
    () => calculateCommission({ mode: "base_to_final", price, commissionPercent: pct, includeVat: true }),
    [price, pct],
  );

  function handlePctText(value: string) {
    setPctText(value);
    setPctError(false);
    if (value.trim() === "" || !isValidNumberInput(value)) {
      setPctError(true);
      return;
    }
    const parsed = parseNumberInput(value, NaN);
    if (!Number.isFinite(parsed)) {
      setPctError(true);
      return;
    }
    setPct(clamp(parsed, 0, 99.99));
  }

  function handleCopy() {
    const text = [
      `Comisión rápida — ${formatCurrency(price)} al ${pct}%`,
      `Comisión agencia: ${formatCurrency(result.commission)}`,
      `Precio comprador: ${formatCurrency(result.buyerPrice)}`,
      `Neto vendedor: ${formatCurrency(result.netSeller)}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSave() {
    save({
      type: "simple_commission",
      title: `Comisión rápida — ${formatCurrency(price)}`,
      summary: [`Comisión al ${pct}%`, `Comisión agencia: ${formatCurrency(result.commission)}`, `Precio comprador: ${formatCurrency(result.buyerPrice)}`, `Neto vendedor: ${formatCurrency(result.netSeller)}`].join("\n"),
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Percent className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-text-primary">Comisión rápida</span>
        <button
          type="button"
          onClick={() => onOpenCalculator?.("simple_commission")}
          className="ml-auto text-xs font-medium text-primary hover:text-primary-dark transition-colors"
        >
          Abrir calculadora
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-text-secondary">Precio base</label>
          <div className="flex h-8 items-center rounded-lg border border-border bg-background px-2.5">
            <span className="text-xs text-text-secondary mr-1">€</span>
            <input
              type="text"
              inputMode="numeric"
              value={price.toLocaleString("es-ES")}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                const num = parseInt(raw, 10);
                if (!isNaN(num)) setPrice(clamp(num, 0, 999999999));
              }}
              className="w-full bg-transparent text-xs font-semibold text-text-primary outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-text-secondary">Comisión</label>
          <div className={cn("flex h-8 items-center rounded-lg border bg-background px-2.5", pctError ? "border-danger" : "border-border")}>
            <input
              type="text"
              inputMode="decimal"
              value={pctText}
              onChange={(e) => handlePctText(e.target.value)}
              onBlur={() => { setPctText(String(pct).replace(".", ",")); setPctError(false); }}
              className="w-full bg-transparent text-xs font-semibold text-text-primary outline-none text-right"
            />
            <span className="text-xs text-text-secondary ml-0.5">%</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Comisión agencia</span>
          <span className="text-sm font-bold text-text-primary">{formatCurrency(result.commission)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-text-secondary">Precio comprador</span>
          <span className="text-sm font-bold text-text-primary">{formatCurrency(result.buyerPrice)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-text-secondary">Neto vendedor</span>
          <span className="text-sm font-bold text-text-primary">{formatCurrency(result.netSeller)}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-raised py-2 text-xs font-medium text-text-primary transition-colors hover:bg-state-hover"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-raised py-2 text-xs font-medium text-text-primary transition-colors hover:bg-state-hover"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
