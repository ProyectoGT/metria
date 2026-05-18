"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/design-system";
import ActiveFilterChips from "./ActiveFilterChips";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface FilterBarProps {
  children?: ReactNode;
  searchSlot?: ReactNode;
  activeCount?: number;
  onClear?: () => void;
  onOpenAdvanced?: () => void;
  advancedCount?: number;
  chips?: Chip[];
  className?: string;
}

export default function FilterBar({
  children,
  searchSlot,
  activeCount = 0,
  onClear,
  onOpenAdvanced,
  advancedCount = 0,
  chips,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-surface shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
        {searchSlot}

        {children}

        {onOpenAdvanced && (
          <button
            type="button"
            onClick={onOpenAdvanced}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all whitespace-nowrap",
              advancedCount > 0
                ? "border-primary/30 bg-primary/8 text-primary"
                : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Mas filtros
            {advancedCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1.5">
                {advancedCount}
              </span>
            )}
          </button>
        )}

        {activeCount > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-text-secondary transition-all hover:border-danger/30 hover:bg-danger/5 hover:text-danger whitespace-nowrap"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
        )}
      </div>

      {chips && chips.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <ActiveFilterChips chips={chips} />
        </div>
      )}
    </div>
  );
}
