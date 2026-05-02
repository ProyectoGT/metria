"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ClipboardPlus, ExternalLink, Lightbulb, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { NextBestAction } from "@/lib/next-actions";

type Props = {
  actions: NextBestAction[];
  currentUserId: number;
};

const PRIORITY_CLASS: Record<NextBestAction["prioridad"], string> = {
  alta: "bg-danger/15 text-danger",
  media: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  baja: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

const TYPE_LABEL: Record<NextBestAction["tipo"], string> = {
  pedido_sin_seguimiento: "Pedido",
  propiedad_sin_actividad: "Propiedad",
  match_alto: "Match",
  tarea_vencida: "Tarea",
  agenda_vencida: "Agenda",
  oportunidad_perdida: "Oportunidad",
};

export default function NextBestActionsPanel({ actions, currentUserId }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState(actions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  async function registerTimeline(action: NextBestAction, status: "aceptada" | "descartada" | "tarea_creada") {
    const pedidoId = action.entidad.pedidoId ?? (action.entidad.type === "pedido" ? action.entidad.id : null);
    const propiedadId = action.entidad.propiedadId ?? (action.entidad.type === "propiedad" ? action.entidad.id : null);
    if (!pedidoId && !propiedadId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: timelineError } = await (supabase as any)
      .from("contacto_timeline_events")
      .insert({
        pedido_id: pedidoId,
        propiedad_id: propiedadId,
        agente_id: currentUserId,
        tipo_evento: "interaccion",
        titulo: `Siguiente mejor accion ${status.replace("_", " ")}`,
        descripcion: `${action.titulo}\n${action.reason}`,
        metadata: {
          source: "next_best_action",
          action_id: action.id,
          action_type: action.tipo,
          status,
          priority: action.prioridad,
        },
      });

    if (timelineError) throw new Error(timelineError.message);
  }

  async function createTask(action: NextBestAction) {
    setBusyId(action.id);
    setError(null);
    const { error: taskError } = await supabase.rpc("create_pending_tarea", {
      p_titulo: action.titulo,
      p_prioridad: action.prioridad,
      p_resultado: `${action.descripcion}\n${action.reason}`,
      p_completed: false,
      p_assigned_user_ids: [currentUserId],
      p_visibility: "private",
    });

    try {
      if (taskError) throw new Error(taskError.message);
      await registerTimeline(action, "tarea_creada");
      setItems((prev) => prev.filter((item) => item.id !== action.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la tarea");
    } finally {
      setBusyId(null);
    }
  }

  async function resolve(action: NextBestAction, status: "aceptada" | "descartada") {
    setBusyId(action.id);
    setError(null);
    try {
      await registerTimeline(action, status);
      setItems((prev) => prev.filter((item) => item.id !== action.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la accion");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl bg-surface p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="mb-5 flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-text-primary">
            <Lightbulb className="h-5 w-5 text-primary" />
            Siguiente mejor accion
          </h2>
          <p className="mt-1 text-sm text-text-secondary">Recomendaciones deterministas segun tu actividad comercial.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-text-secondary">
            {items.length}
          </span>
          <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
        </div>
      </button>

      {!collapsed && (
        <>
          {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
              <p className="mt-3 text-sm text-text-secondary">No hay recomendaciones pendientes ahora mismo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((action) => {
            const busy = busyId === action.id;
            return (
              <article key={action.id} className="rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                        {TYPE_LABEL[action.tipo]}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_CLASS[action.prioridad]}`}>
                        {action.prioridad}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-text-primary">{action.titulo}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{action.descripcion}</p>
                    <p className="mt-2 text-xs text-text-secondary">{action.reason}</p>
                  </div>
                  <Link href={action.actionUrl} className="shrink-0 rounded p-1.5 text-text-secondary hover:bg-surface hover:text-primary" title="Abrir">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => createTask(action)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-primary disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardPlus className="h-3.5 w-3.5" />}
                    Crear tarea
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(action, "aceptada")}
                    disabled={busy}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(action, "descartada")}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-danger disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Descartar
                  </button>
                </div>
              </article>
            );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
