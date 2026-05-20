"use client";

import { cn } from "@/lib/design-system";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

interface FilterSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export default function FilterSelect({ className, children, label, ...props }: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn("input h-9 appearance-none py-0 pl-3 pr-8 text-sm", className)}
        aria-label={label}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
    </div>
  );
}
