"use client";

import { BarChart3 } from "lucide-react";
import { useLocalSimulations } from "../../hooks/use-local-simulations";

export default function MonthStatsWidget() {
  const { simulations } = useLocalSimulations();
  const now = new Date();
  const thisMonth = simulations.filter((s) => {
    const d = new Date(s.savedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const total = simulations.length;
  const monthCount = thisMonth.length;
  const types = new Set(thisMonth.map((s) => s.type)).size;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-text-primary">Tu mes</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-background p-2.5 text-center">
          <p className="text-lg font-bold text-text-primary">{monthCount}</p>
          <p className="text-[10px] font-medium text-text-secondary leading-tight mt-0.5">Simulaciones</p>
        </div>
        <div className="rounded-xl bg-background p-2.5 text-center">
          <p className="text-lg font-bold text-text-primary">{total}</p>
          <p className="text-[10px] font-medium text-text-secondary leading-tight mt-0.5">Totales</p>
        </div>
        <div className="rounded-xl bg-background p-2.5 text-center">
          <p className="text-lg font-bold text-text-primary">{types}</p>
          <p className="text-[10px] font-medium text-text-secondary leading-tight mt-0.5">Tipos</p>
        </div>
      </div>
    </div>
  );
}
