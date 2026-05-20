"use client";

import { cn } from "@/lib/design-system";

interface FilterToggleProps {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
  className?: string;
}

export default function FilterToggle({ label, active, onChange, className }: FilterToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        className
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          active ? "bg-primary" : "bg-border"
        )}
      />
      {label}
    </button>
  );
}
