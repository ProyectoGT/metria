"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, GitBranch, Loader2, X, ClipboardPlus, ArrowRight } from "lucide-react";
import type { PipelineSuggestion, PipelineSuggestionRule } from "@/lib/pipeline-suggestions";
import {
  acceptPipelineSuggestionAction,
  rejectPipelineSuggestionAction,
} from "@/app/(crm)/dashboard/pipeline-actions";

type Props = {
  suggestions: PipelineSuggestion[];
};

const RULE_LABEL: Record<PipelineSuggestionRule, string> = {
  pedido_frio: "Pedido frio",
  visita_agendada: "Visita",
  propiedad_sin_actividad: "Sin actividad",
  encargo_firmado: "Encargo",
  oportunidad_activa: "Oportunidad",
};

const RULE_COLOR: Record<PipelineSuggestionRule, string> = {
  pedido_frio: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  visita_agendada: "bg-success/15 text-success",
  propiedad_sin_actividad: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  encargo_firmado: "bg-primary/15 text-primary",
  oportunidad_activa: "bg-success/15 text-success",
};

const ESTADO_COLOR: Record<string, string> = {
  neutral: "bg-muted text-text-secondary",
  investigacion: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  seguimiento: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  noticia: "bg-primary/15 text-primary",
  encargo: "bg-success/15 text-success",
  vendido: "bg-success/20 text-success",
  activo: "bg-primary/15 text-primary",
  frio: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

function EstadoBadge({ estado }: { estado: string }) {
  const cls = ESTADO_COLOR[estado] ?? "bg-muted text-text-secondary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {estado}
    </span>
  );
}

export default function PipelineSuggestionsPanel({ suggestions: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [collapsed, setCollapsed] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(id: number, crearTarea: boolean) {
    setBusyId(id);
    setError(null);
    const result = await acceptPipelineSuggestionAction(id, { crearTarea });
    if (result.ok) {
      setItems((prev) => prev.filter((s) => s.id !== id));
    } else {
      setError(result.error);
    }
    setBusyId(null);
  }

  async function handleReject(id: number) {
    setBusyId(id);
    setError(null);
    const result = await rejectPipelineSuggestionAction(id);
    if (result.ok) {
      setItems((prev) => prev.filter((s) => s.id !== id));
    } else {
      setError(result.error);
    }
    setBusyId(null);
  }

  return (
    <section className="rounded-xl bg-surface p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <GitBranch className="h-5 w-5 text-primary" />
            Estado inteligente del pipeline
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Sugerencias automaticas de cambio de estado segun actividad real.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-text-secondary">
            {items.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
          />
        </div>
      </button>

      {!collapsed && (
        <div className="mt-5">
          {error && (
            <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
              <p className="mt-3 text-sm text-text-secondary">
                No hay sugerencias de estado pendientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((s) => {
                const busy = busyId === s.id;
                const ruleLabel = RULE_LABEL[s.tipo_regla] ?? s.tipo_regla;
                const ruleColor = RULE_COLOR[s.tipo_regla] ?? "bg-muted text-text-secondary";

                return (
                  <article
                    key={s.id}
                    className="rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ruleColor}`}>
                            {ruleLabel}
                          </span>
                          {s.pedido_id && (
                            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                              Pedido #{s.pedido_id}
                            </span>
                          )}
                          {s.propiedad_id && (
                            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                              Propiedad #{s.propiedad_id}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 text-sm font-semibold text-text-primary">
                          {s.label || (s.pedido_id ? `Pedido #${s.pedido_id}` : `Propiedad #${s.propiedad_id}`)}
                        </h3>

                        {/* Transición de estado */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <EstadoBadge estado={s.estado_actual} />
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                          <EstadoBadge estado={s.estado_sugerido} />
                        </div>

                        <p className="mt-2 text-xs text-text-secondary">{s.razon}</p>

                        {s.agente_nombre && (
                          <p className="mt-1 text-xs text-text-secondary">
                            Agente: {s.agente_nombre}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(s.id, true)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-primary disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ClipboardPlus className="h-3.5 w-3.5" />
                        )}
                        Aceptar + tarea
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccept(s.id, false)}
                        disabled={busy}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(s.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-danger disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
