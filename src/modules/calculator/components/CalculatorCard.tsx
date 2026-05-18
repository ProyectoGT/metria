"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MoreVertical, Copy, ExternalLink } from "lucide-react";
import Badge from "@/components/ui/badge";
import { cn } from "@/lib/design-system";
import type { CalculatorConfig, CalculatorType } from "../types";

type CalculatorCardProps = {
  config: CalculatorConfig;
  isFavorite: boolean;
  usageCount: number;
  onSelect: (id: CalculatorType) => void;
  onToggleFavorite: (id: CalculatorType) => void;
};

export default function CalculatorCard({ config, isFavorite, usageCount, onSelect, onToggleFavorite }: CalculatorCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = config.icon;

  function handleCopyLink() {
    const url = `${window.location.origin}/calculadora`;
    navigator.clipboard.writeText(url);
    setMenuOpen(false);
  }

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(config.id)}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-surface p-4 text-left shadow-sm transition-all",
        "border-border hover:border-border-strong hover:bg-surface-elevated hover:shadow-md",
        "cursor-pointer",
      )}
    >
      {/* Main row: icon + title + badge */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">{config.title}</span>
            {config.badge && (
              <Badge variant={config.badge === "Nuevo" ? "success" : "primary"} size="sm">{config.badge}</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary leading-relaxed line-clamp-1">{config.description}</p>
        </div>

        {/* Menu button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-state-hover hover:text-text-primary"
            aria-label="Opciones"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-border bg-surface shadow-lg p-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(config.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-state-hover"
                >
                  <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-danger text-danger")} />
                  {isFavorite ? "Quitar favorito" : "Añadir favorito"}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-state-hover"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar enlace
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); window.open(`${window.location.origin}/calculadora`, "_blank"); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-state-hover"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir en nueva pestaña
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-text-secondary/70">
        {usageCount > 0 && (
          <span>{usageCount} uso{usageCount !== 1 ? "s" : ""}</span>
        )}
        {isFavorite && <Heart className="h-3 w-3 fill-danger text-danger" />}
      </div>
    </motion.button>
  );
}
