"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardPlus, Home, Loader2, MessageSquarePlus, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import {
  calculatePropertyMatches,
  type MatchPedido,
  type MatchPropiedad,
  type PropertyMatch,
} from "@/modules/matching/services";

type Props = {
  pedido: MatchPedido;
  currentUserId: number | null;
};

function propiedadLabel(propiedad: MatchPropiedad) {
  if (propiedad.propietario?.trim()) return propiedad.propietario.trim();
  const parts = [propiedad.planta && `Planta ${propiedad.planta}`, propiedad.puerta && `Puerta ${propiedad.puerta}`].filter(Boolean);
  return parts.length ? parts.join(" ") : `Propiedad #${propiedad.id}`;
}

function locationLabel(propiedad: MatchPropiedad) {
  return [
    propiedad.fincas?.sectores?.zona?.nombre,
    propiedad.fincas?.sectores?.numero != null ? `Sector ${propiedad.fincas.sectores.numero}` : null,
    propiedad.fincas?.numero ? `Finca ${propiedad.fincas.numero}` : null,
  ].filter(Boolean).join(" · ") || "Ubicacion sin definir";
}

function scoreColor(score: number) {
  if (score >= 75) return "bg-success/15 text-success";
  if (score >= 50) return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

export default function PropertyMatchesPanel({ pedido, currentUserId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function loadMatches() {
    setLoading(true);
    setError(null);

    // RLS limita las propiedades segun empresa/equipo/agente.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: loadError } = await (supabase as any)
      .from("propiedades")
      .select("id,planta,puerta,propietario,estado,notas,honorarios,finca_id,fincas(id,numero,sectores(id,numero,zona_id,zona(id,nombre)))")
      .not("estado", "ilike", "vendid%")
      .order("id", { ascending: false })
      .limit(250);

    if (loadError) {
      setError(loadError.message);
      setMatches([]);
    } else {
      setMatches(calculatePropertyMatches(pedido, (data ?? []) as MatchPropiedad[], { minScore: 25, limit: 12 }));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido.id]);

  async function createFollowUpTask(match: PropertyMatch) {
    setBusyId(match.propiedad.id);
    setError(null);

    const title = `Seguimiento match: ${pedido.nombre_cliente} - ${propiedadLabel(match.propiedad)}`;
    const { error: taskError } = await supabase.rpc("create_pending_tarea", {
      p_titulo: title,
      p_prioridad: match.score >= 75 ? "alta" : "media",
      p_resultado: `Score ${match.score}. ${match.razones.join("; ")}`,
      p_completed: false,
      p_assigned_user_ids: currentUserId ? [currentUserId] : undefined,
      p_visibility: "private",
    });

    if (taskError) {
      setError(taskError.message);
    } else {
      setDone((prev) => ({ ...prev, [`task-${match.propiedad.id}`]: true }));
    }
    setBusyId(null);
  }

  async function registerInTimeline(match: PropertyMatch) {
    setBusyId(match.propiedad.id);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: timelineError } = await (supabase as any)
      .from("contacto_timeline_events")
      .insert({
        pedido_id: pedido.id,
        propiedad_id: match.propiedad.id,
        agente_id: currentUserId,
        tipo_evento: "interaccion",
        titulo: `Match con ${propiedadLabel(match.propiedad)}`,
        descripcion: `Score ${match.score}\n${match.razones.join("\n")}`,
        metadata: {
          source: "property_matching",
          score: match.score,
          razones: match.razones,
          propiedad_id: match.propiedad.id,
        },
      });

    if (timelineError) {
      setError(timelineError.message);
    } else {
      setDone((prev) => ({ ...prev, [`timeline-${match.propiedad.id}`]: true }));
    }
    setBusyId(null);
  }

  return (
    <section className="rounded-xl border border-border bg-background/60">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Propiedades compatibles</h3>
        </div>
        <button
          type="button"
          onClick={loadMatches}
          disabled={loading}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-primary disabled:opacity-50"
          title="Recalcular"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="mx-4 mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="max-h-[360px] overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-sm text-text-secondary">No hay propiedades compatibles con los criterios actuales.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => {
              const busy = busyId === match.propiedad.id;
              return (
                <li key={match.propiedad.id} className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">{propiedadLabel(match.propiedad)}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">{locationLabel(match.propiedad)}</p>
                      {match.propiedad.estado && (
                        <p className="mt-1 text-xs text-text-secondary">Estado: {match.propiedad.estado}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreColor(match.score)}`}>
                      {match.score}
                    </span>
                  </div>

                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {match.razones.map((razon) => (
                      <li key={razon} className="rounded-full bg-background px-2 py-0.5 text-[11px] text-text-secondary">
                        {razon}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => createFollowUpTask(match)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary disabled:opacity-50"
                    >
                      {done[`task-${match.propiedad.id}`] ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <ClipboardPlus className="h-3.5 w-3.5" />}
                      Crear tarea de seguimiento
                    </button>
                    <button
                      type="button"
                      onClick={() => registerInTimeline(match)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                    >
                      {done[`timeline-${match.propiedad.id}`] ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
                      Registrar en timeline
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
