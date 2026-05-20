"use client";

import { Clock, History, Trash2 } from "lucide-react";
import { useLocalSimulations } from "../../hooks/use-local-simulations";

export default function LastSimulationWidget() {
  const { simulations, remove } = useLocalSimulations();
  const last = simulations[0];

  if (!last) {
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-text-secondary">
            <History className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-text-primary">Última simulación</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Clock className="h-6 w-6 text-text-secondary/40 mb-2" />
          <p className="text-xs font-medium text-text-secondary">Ninguna aún</p>
          <p className="text-[11px] text-text-secondary/60 mt-0.5">Guarda una simulación para verla aquí</p>
        </div>
      </div>
    );
  }

  const date = new Date(last.savedAt).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-text-primary">Última simulación</span>
      </div>
      <div className="rounded-xl bg-background p-3">
        <p className="text-xs font-semibold text-text-primary truncate">{last.title}</p>
        <p className="text-[11px] text-text-secondary mt-0.5">{date}</p>
        <div className="mt-2 border-t border-border pt-2">
          <pre className="text-[11px] text-text-secondary/80 line-clamp-2 whitespace-pre-wrap leading-relaxed">
            {last.summary}
          </pre>
        </div>
      </div>
      <button
        type="button"
        onClick={() => remove(last.id)}
        className="mt-2 flex items-center gap-1 text-[11px] text-text-secondary hover:text-danger transition-colors"
      >
        <Trash2 className="h-3 w-3" />
        Eliminar
      </button>
    </div>
  );
}
