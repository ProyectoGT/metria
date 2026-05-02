"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, X, Plus, Check, Loader2, Ban, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import {
  invitarColaboradorAction,
  aceptarColaboracionAction,
  rechazarColaboracionAction,
  cancelarColaboracionAction,
  type ColaboracionEntidadTipo,
} from "@/app/(crm)/colaboraciones/actions";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type EstadoColaboracion = "pendiente" | "aceptada" | "rechazada" | "cancelada";

type Colaboracion = {
  id: number;
  estado: EstadoColaboracion;
  porcentaje_comision: number | null;
  notas: string | null;
  created_at: string;
  agente_owner_id: number;
  agente_colaborador_id: number;
  owner_nombre: string;
  colaborador_nombre: string;
};

type Agente = { id: number; nombre: string; apellidos: string };

type Props = {
  entidad_tipo: ColaboracionEntidadTipo;
  entidad_id: number;
  entidad_label: string;
  currentUserId: number;
  agentes: Agente[];         // todos los agentes visibles (sin el actual para invite)
  onClose: () => void;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_STYLE: Record<EstadoColaboracion, { label: string; cls: string }> = {
  pendiente:  { label: "Pendiente",  cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  aceptada:   { label: "Activa",     cls: "bg-success/15 text-success" },
  rechazada:  { label: "Rechazada",  cls: "bg-danger/15 text-danger" },
  cancelada:  { label: "Cancelada",  cls: "bg-muted text-text-secondary" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function ColaboracionesPanel({
  entidad_tipo,
  entidad_id,
  entidad_label,
  currentUserId,
  agentes,
  onClose,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [colaboraciones, setColaboraciones] = useState<Colaboracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | string | null>(null);

  // Formulario de invitación
  const [showInvite, setShowInvite] = useState(false);
  const [inviteColaboradorId, setInviteColaboradorId] = useState<string>("");
  const [inviteComision, setInviteComision] = useState<string>("");
  const [inviteNotas, setInviteNotas] = useState<string>("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // ── Carga ────────────────────────────────────────────────────────────────────

  async function loadColaboraciones() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from("colaboraciones")
      .select(`
        id, estado, porcentaje_comision, notas, created_at,
        agente_owner_id, agente_colaborador_id,
        owner:usuarios!colaboraciones_agente_owner_id_fkey(nombre, apellidos),
        colaborador:usuarios!colaboraciones_agente_colaborador_id_fkey(nombre, apellidos)
      `)
      .eq("entidad_tipo", entidad_tipo)
      .eq("entidad_id", entidad_id)
      .order("created_at", { ascending: false });

    if (err) {
      setError("Error al cargar colaboraciones");
    } else {
      type Row = {
        id: number; estado: string; porcentaje_comision: number | null; notas: string | null;
        created_at: string; agente_owner_id: number; agente_colaborador_id: number;
        owner: { nombre: string; apellidos: string } | null;
        colaborador: { nombre: string; apellidos: string } | null;
      };
      setColaboraciones(
        ((data ?? []) as Row[]).map((r) => ({
          id: r.id,
          estado: r.estado as EstadoColaboracion,
          porcentaje_comision: r.porcentaje_comision,
          notas: r.notas,
          created_at: r.created_at,
          agente_owner_id: r.agente_owner_id,
          agente_colaborador_id: r.agente_colaborador_id,
          owner_nombre: r.owner ? `${r.owner.nombre} ${r.owner.apellidos}`.trim() : `#${r.agente_owner_id}`,
          colaborador_nombre: r.colaborador ? `${r.colaborador.nombre} ${r.colaborador.apellidos}`.trim() : `#${r.agente_colaborador_id}`,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => { loadColaboraciones(); }, [entidad_id, entidad_tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Invitar ───────────────────────────────────────────────────────────────────

  async function handleInvite() {
    if (!inviteColaboradorId) { setInviteError("Selecciona un agente"); return; }
    setBusyId("invite");
    setInviteError(null);

    const result = await invitarColaboradorAction({
      entidad_tipo,
      entidad_id,
      colaborador_id: Number(inviteColaboradorId),
      porcentaje_comision: inviteComision ? Number(inviteComision) : null,
      notas: inviteNotas || null,
    });

    if (!result.ok) {
      setInviteError(result.error);
    } else {
      setShowInvite(false);
      setInviteColaboradorId("");
      setInviteComision("");
      setInviteNotas("");
      await loadColaboraciones();
    }
    setBusyId(null);
  }

  // ── Acciones sobre colaboración existente ─────────────────────────────────────

  async function handleAction(
    id: number,
    fn: (id: number) => Promise<{ ok: boolean; error?: string }>
  ) {
    setBusyId(id);
    setError(null);
    const result = await fn(id);
    if (!result.ok) setError(result.error ?? "Error");
    await loadColaboraciones();
    setBusyId(null);
  }

  // Agentes disponibles para invitar (excluir al usuario actual y a los que ya tienen colab activa)
  const activeColabIds = new Set(
    colaboraciones
      .filter((c) => c.estado === "pendiente" || c.estado === "aceptada")
      .map((c) => c.agente_owner_id === currentUserId ? c.agente_colaborador_id : c.agente_owner_id)
  );
  const agentesDisponibles = agentes.filter(
    (a) => a.id !== currentUserId && !activeColabIds.has(a.id)
  );

  const activeCount = colaboraciones.filter(
    (c) => c.estado === "pendiente" || c.estado === "aceptada"
  ).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-2xl bg-surface shadow-xl" style={{ maxHeight: "calc(100vh - 2rem)" }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <Users className="h-4 w-4 text-primary" />
              Colaboraciones
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">{entidad_label}</p>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {activeCount} activa{activeCount > 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}

          {/* Botón invitar */}
          <button
            type="button"
            onClick={() => { setShowInvite((v) => !v); setInviteError(null); }}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-primary/40 px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Invitar colaborador
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showInvite ? "rotate-180" : ""}`} />
          </button>

          {/* Formulario de invitación */}
          {showInvite && (
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Agente *
                </label>
                <select
                  value={inviteColaboradorId}
                  onChange={(e) => setInviteColaboradorId(e.target.value)}
                  className="input"
                >
                  <option value="">Selecciona un agente...</option>
                  {agentesDisponibles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.apellidos}
                    </option>
                  ))}
                </select>
                {agentesDisponibles.length === 0 && (
                  <p className="mt-1 text-xs text-text-secondary italic">
                    Todos los agentes disponibles ya tienen colaboracion activa.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Porcentaje de comision (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={inviteComision}
                    onChange={(e) => setInviteComision(e.target.value)}
                    placeholder="Ej: 30"
                    className="input w-28"
                  />
                  <span className="text-sm text-text-secondary">%</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Notas (opcional)
                </label>
                <textarea
                  value={inviteNotas}
                  onChange={(e) => setInviteNotas(e.target.value)}
                  placeholder="Condiciones u observaciones de la colaboracion..."
                  rows={2}
                  className="input resize-none"
                />
              </div>

              {inviteError && (
                <p className="text-xs text-danger">{inviteError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setInviteError(null); }}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={busyId === "invite" || !inviteColaboradorId}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  {busyId === "invite" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Enviar invitacion
                </button>
              </div>
            </div>
          )}

          {/* Lista de colaboraciones */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
            </div>
          ) : colaboraciones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <Users className="mx-auto h-8 w-8 text-text-secondary/40" />
              <p className="mt-3 text-sm text-text-secondary">Sin colaboraciones en esta entidad.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {colaboraciones.map((col) => {
                const { label, cls } = ESTADO_STYLE[col.estado];
                const busy = busyId === col.id;
                const isOwner = col.agente_owner_id === currentUserId;
                const isColaborador = col.agente_colaborador_id === currentUserId;
                const canCancel = isOwner && (col.estado === "pendiente" || col.estado === "aceptada");
                const canAccept = isColaborador && col.estado === "pendiente";
                const canReject = isColaborador && col.estado === "pendiente";
                const isResolved = col.estado === "rechazada" || col.estado === "cancelada";

                return (
                  <div
                    key={col.id}
                    className={`rounded-xl border border-border bg-background p-4 ${isResolved ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Partes */}
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="font-semibold text-text-primary">{col.owner_nombre}</span>
                          <span className="text-text-secondary">→</span>
                          <span className="font-semibold text-text-primary">{col.colaborador_nombre}</span>
                          {isOwner && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">tú</span>
                          )}
                          {isColaborador && (
                            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">invitado</span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                            {label}
                          </span>
                          {col.porcentaje_comision != null && (
                            <span className="text-xs text-text-secondary">
                              Comision: <span className="font-medium text-text-primary">{col.porcentaje_comision}%</span>
                            </span>
                          )}
                          <span className="text-xs text-text-secondary">{formatDate(col.created_at)}</span>
                        </div>

                        {col.notas && (
                          <p className="mt-1.5 text-xs text-text-secondary italic">{col.notas}</p>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {canAccept && (
                          <button
                            onClick={() => handleAction(col.id, aceptarColaboracionAction)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg bg-success px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Aceptar
                          </button>
                        )}
                        {canReject && (
                          <button
                            onClick={() => handleAction(col.id, rechazarColaboracionAction)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            Rechazar
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleAction(col.id, cancelarColaboracionAction)}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface hover:text-danger disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
