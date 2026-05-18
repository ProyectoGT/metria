"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/design-system";

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  className?: string;
}

export default function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary transition-all hover:border-primary/40 hover:bg-primary/12",
        className
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex rounded-full p-0.5 text-primary/60 transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label={`Quitar filtro: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
