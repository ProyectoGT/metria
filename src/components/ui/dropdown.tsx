import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn, UI } from "@/lib/design-system";

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Dropdown({ children, className = "", ...props }: DropdownProps) {
  return (
    <div className={cn("dropdown origin-top animate-in", className)} {...props}>
      {children}
    </div>
  );
}

interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
}

export function DropdownItem({ children, active = false, className = "", ...props }: DropdownItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "pressable flex w-full items-center gap-2 rounded-ds-sm px-3 py-2 text-left text-sm text-text-secondary",
        active ? "bg-state-active text-primary" : "hover:bg-state-hover hover:text-text-primary",
        UI.focus,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
