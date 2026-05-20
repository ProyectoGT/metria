"use client";

import { Banknote, Building2, CircleDollarSign, Home, KeyRound } from "lucide-react";
import type { ElementType } from "react";
import { cn } from "@/lib/design-system";
import {
  MODALIDADES_PEDIDO,
  type ModalidadPedido,
} from "@/modules/solicitudes/services/modalidades";

type Props = {
  value: string | null;
  onChange: (value: ModalidadPedido | null) => void;
};

const MODALIDAD_ICONS: Record<ModalidadPedido, ElementType> = {
  CV: Home,
  CH: Building2,
  ALQ: KeyRound,
  CONTADO: Banknote,
};

export default function ModalidadSelector({ value, onChange }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MODALIDADES_PEDIDO.map((option) => {
        const selected = value === option.value;
        const Icon = MODALIDAD_ICONS[option.value] ?? CircleDollarSign;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(selected ? null : option.value)}
            aria-pressed={selected}
            title={option.title}
            className={cn(
              "group relative min-h-[86px] rounded-lg border bg-surface px-3 py-3 text-left shadow-sm outline-none transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background hover:shadow-md",
              "focus-visible:ring-2 focus-visible:ring-state-focus focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              selected ? cn("shadow-md ring-1 ring-inset", option.cardClassName) : "border-border text-text-primary",
            )}
          >
            <span className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  selected ? option.iconClassName : "bg-background text-text-secondary group-hover:text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text-primary">{option.label}</span>
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_0_4px_rgba(34,197,94,0.10)]" />
                  )}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-text-secondary">{option.title}</span>
                <span className="mt-1 block text-xs leading-5 text-text-secondary">{option.description}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
