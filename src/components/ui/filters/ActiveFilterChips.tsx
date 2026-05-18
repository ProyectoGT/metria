"use client";

import { cn } from "@/lib/design-system";
import FilterChip from "./FilterChip";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: Chip[];
  className?: string;
}

export default function ActiveFilterChips({ chips, className }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((chip) => (
        <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
      ))}
    </div>
  );
}
