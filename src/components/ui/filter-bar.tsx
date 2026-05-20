// ─── FilterBar ────────────────────────────────────────────────────────────────
// Contenedor de filtros con badge de "N activos" y botón de limpiar.
//
// USO:
//   <FilterBar activeCount={2} onClear={() => resetFilters()}>
//     <select className="input w-auto text-sm">…</select>
//     <input type="date" className="input text-sm" />
//   </FilterBar>
//
// El badge de conteo y el botón "Limpiar" solo aparecen cuando activeCount > 0.
// ─────────────────────────────────────────────────────────────────────────────

import { SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  activeCount?: number;
  onClear?: () => void;
  className?: string;
}

export default function FilterBar({
  children,
  activeCount = 0,
  onClear,
  className = "",
}: FilterBarProps) {
  return (
    <div
      className={[
        "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3",
        className,
      ].join(" ")}
    >
      {/* Icono */}
      <SlidersHorizontal className="h-4 w-4 shrink-0 text-text-secondary" />

      {/* Slots de filtro */}
      {children}

      {/* Badge de filtros activos + botón limpiar */}
      {activeCount > 0 && (
        <>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            {activeCount}
          </span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </>
      )}
    </div>
  );
}
