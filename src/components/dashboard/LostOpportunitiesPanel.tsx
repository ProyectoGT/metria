"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  ClipboardPlus,
  ExternalLink,
  Loader2,
  X,
  User,
  Clock,
} from "lucide-react";
import type { LostOpportunity, ImpactLevel, OpportunityReason } from "@/lib/opportunities";
import {
  createTaskFromOpportunityAction,
  dismissOpportunityAction,
} from "@/app/(crm)/dashboard/opportunity-actions";

type Props = {
  opportunities: LostOpportunity[];
};

const REASON_LABEL: Record<OpportunityReason, string> = {
  pedido_sin_actividad: "Sin actividad",
  match_sin_seguimiento: "Match sin seguimiento",
  propiedad_con_interesados: "Propiedad inactiva",
  tarea_vencida_clave: "Tarea vencida",
  contacto_sin_convertir: "Lead sin convertir",
};

const IMPACT_STYLE: Record<ImpactLevel, { badge: string; border: string }> = {
  alto: {
    badge: "bg-danger/15 text-danger",
    border: "border-l-2 border-l-danger",
  },
  medio: {
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    border: "border-l-2 border-l-amber-500",
  },
  bajo: {
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    border: "border-l-2 border-l-blue-500",
  },
};

const ENTITY_TYPE_LABEL: Record<LostOpportunity["entidad"]["type"], string> = {
  pedido: "Pedido",
  propiedad: "Propiedad",
  tarea: "Tarea",
  contacto: "Contacto",
};

function formatRelative(isoDate: string | null): string {
  if (!isoDate) return "—";
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} dias`;
}

export default function LostOpportunitiesPanel({ opportunities: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [collapsed, setCollapsed] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const altoCount = items.filter((o) => o.impacto === "alto").length;

  async function handleCreateTask(opp: LostOpportunity) {
    setBusyId(opp.id);
    setError(null);
    const result = await createTaskFromOpportunityAction({
      id: opp.id,
      titulo: opp.titulo,
      razon: opp.razon,
      accion_recomendada: opp.accion_recomendada,
      entidad: opp.entidad,
      impacto: opp.impacto,
    });
    if (result.ok) {
      setItems((prev) => prev.filter((o) => o.id !== opp.id));
    } else {
      setError(result.error);
    }
    setBusyId(null);
  }

  async function handleDismiss(opp: LostOpportunity) {
    setBusyId(`dismiss-${opp.id}`);
    setError(null);
    const result = await dismissOpportunityAction({
      id: opp.id,
      razon: opp.razon,
      entidad: opp.entidad,
    });
    if (result.ok) {
      setItems((prev) => prev.filter((o) => o.id !== opp.id));
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
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Oportunidades a recuperar
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Clientes, pedidos y propiedades con potencial de negocio sin seguimiento.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {altoCount > 0 && (
            <span className="rounded-full bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger">
              {altoCount} alta
            </span>
          )}
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
                No se detectan oportunidades perdidas en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((opp) => {
                const busy = busyId === opp.id;
                const dismissBusy = busyId === `dismiss-${opp.id}`;
                const anyBusy = busy || dismissBusy;
                const { badge, border } = IMPACT_STYLE[opp.impacto];
                const reasonLabel = REASON_LABEL[opp.razon];
                const entityTypeLabel = ENTITY_TYPE_LABEL[opp.entidad.type];

                return (
                  <article
                    key={opp.id}
                    className={`rounded-xl border border-border bg-background px-4 py-3 ${border}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge}`}>
                            {opp.impacto}
                          </span>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                            {entityTypeLabel}
                          </span>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                            {reasonLabel}
                          </span>
                        </div>

                        {/* Título */}
                        <h3 className="mt-2 text-sm font-semibold text-text-primary">
                          {opp.titulo}
                        </h3>

                        {/* Descripción */}
                        <p className="mt-1 text-sm text-text-secondary">{opp.descripcion}</p>

                        {/* Acción recomendada */}
                        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-text-secondary">
                          <span className="font-medium text-text-primary">Accion: </span>
                          {opp.accion_recomendada}
                        </p>

                        {/* Meta */}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                          {opp.agente_nombre && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {opp.agente_nombre}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Ultima actividad: {formatRelative(opp.ultima_actividad)}
                          </span>
                          <span className="font-medium text-text-primary">{opp.impacto_estimado}</span>
                        </div>
                      </div>

                      {/* Link a la entidad */}
                      <Link
                        href={opp.entidad.url}
                        className="shrink-0 rounded p-1.5 text-text-secondary hover:bg-surface hover:text-primary"
                        title="Abrir"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>

                    {/* Acciones */}
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateTask(opp)}
                        disabled={anyBusy}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ClipboardPlus className="h-3.5 w-3.5" />
                        )}
                        Crear tarea
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(opp)}
                        disabled={anyBusy}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-danger disabled:opacity-50"
                      >
                        {dismissBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        Descartar
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
