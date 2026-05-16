"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Badge from "@/components/ui/badge";
import { cn } from "@/lib/design-system";
import type { CalculatorConfig, CalculatorType } from "../types";

type CalculatorCardProps = {
  config: CalculatorConfig;
  selected: boolean;
  onSelect: (id: CalculatorType) => void;
};

export default function CalculatorCard({ config, selected, onSelect }: CalculatorCardProps) {
  const Icon = config.icon;
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(config.id)}
      className={cn(
        "group flex h-full min-h-36 cursor-pointer flex-col justify-between rounded-ds-lg border bg-surface p-5 text-left shadow-layer-1 transition-all",
        selected ? "border-primary ring-2 ring-state-focus" : "border-border hover:border-border-strong hover:bg-surface-elevated hover:shadow-layer-2",
      )}
    >
      <span className="flex items-start justify-between gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-ds-md bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        {config.badge && <Badge variant={config.badge === "Nuevo" ? "success" : "primary"}>{config.badge}</Badge>}
      </span>
      <span className="mt-5 block">
        <span className="block text-sm font-semibold text-text-primary">{config.title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-text-secondary">{config.description}</span>
      </span>
      <span className="mt-4 flex items-center justify-between text-xs font-semibold text-primary">
        Abrir simulador
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  );
}
