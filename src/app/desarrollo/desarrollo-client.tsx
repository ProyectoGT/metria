"use client";

import { useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rendimiento {
  id?: number;
  agente_id: number;
  anio: number;
  mes: number; // 0 = anual, 1-12 = mes
  facturado: number;
  objetivo_facturado: number;
  encargos: number;
  objetivo_encargos: number;
  ventas: number;
  objetivo_ventas: number;
  contactos: number;
  objetivo_contactos: number;
}

interface Agente {
  id: number;
  nombre: string;
  apellidos: string;
  puesto: string;
  rendimiento: Rendimiento | null;
}

interface Props {
  agentes: Agente[];
  totalNoticias: number;
  canEdit: boolean;
  defaultAnio: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES_LABEL = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
];

const RADIUS = 38;
const CIRC = 2 * Math.PI * RADIUS;

const METRICS = [
  { key: "facturado"  as const, objKey: "objetivo_facturado"  as const, label: "Facturado",  color: "var(--color-primary)",  isCurrency: true  },
  { key: "encargos"   as const, objKey: "objetivo_encargos"   as const, label: "Encargos",   color: "#7c3aed",               isCurrency: false },
  { key: "ventas"     as const, objKey: "objetivo_ventas"     as const, label: "Ventas",     color: "var(--color-success)",  isCurrency: false },
  { key: "contactos"  as const, objKey: "objetivo_contactos"  as const, label: "Contactos",  color: "var(--color-accent)",   isCurrency: false },
] as const;

function defaultRendimiento(agenteId: number, anio: number, mes: number): Rendimiento {
  return {
    agente_id: agenteId, anio, mes,
    facturado: 0, objetivo_facturado: 100000,
    encargos: 0,  objetivo_encargos: 10,
    ventas: 0,    objetivo_ventas: 5,
    contactos: 0, objetivo_contactos: 50,
  };
}

function fmtNum(v: number, isCurrency: boolean): string {
  if (!isCurrency) return String(v);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ─── Ring ─────────────────────────────────────────────────────────────────────

function Ring({
  value, objetivo, color, label, isCurrency,
}: {
  value: number; objetivo: number; color: string; label: string; isCurrency: boolean;
}) {
  const pct    = objetivo > 0 ? Math.min(value / objetivo, 1) : 0;
  const offset = CIRC * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[84px] w-[84px]">
        <svg className="h-[84px] w-[84px] -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="7"
            style={{ stroke: "var(--color-border)" }} />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ stroke: color, transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[13px] font-bold text-text-primary leading-none">
            {fmtNum(value, isCurrency)}
          </span>
          <span className="text-[10px] text-text-secondary leading-tight mt-0.5">
            /{fmtNum(objetivo, isCurrency)}
          </span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DesarrolloClient({
  agentes, totalNoticias, canEdit, defaultAnio,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [anio, setAnio]   = useState(defaultAnio);
  const [mes,  setMes]    = useState(0); // 0 = anual

  const [statsMap, setStatsMap] = useState<Record<number, Rendimiento>>(() =>
    Object.fromEntries(
      agentes.map((a) => [
        a.id,
        a.rendimiento ?? defaultRendimiento(a.id, defaultAnio, 0),
      ])
    )
  );

  const [editAgente, setEditAgente] = useState<Agente | null>(null);
  const [editForm,   setEditForm]   = useState<Rendimiento | null>(null);
  const [saving,     setSaving]     = useState(false);

  // Re-fetch when period changes
  const fetchStats = useCallback(
    async (a: number, m: number) => {
      const { data } = await supabase
        .from("rendimiento")
        .select("*")
        .eq("anio", a)
        .eq("mes", m);

      setStatsMap(
        Object.fromEntries(
          agentes.map((ag) => [
            ag.id,
            data?.find((r) => r.agente_id === ag.id) ?? defaultRendimiento(ag.id, a, m),
          ])
        )
      );
    },
    [supabase, agentes]
  );

  function handlePeriod(newAnio: number, newMes: number) {
    setAnio(newAnio);
    setMes(newMes);
    fetchStats(newAnio, newMes);
  }

  function openEdit(agente: Agente) {
    setEditAgente(agente);
    setEditForm({ ...statsMap[agente.id] });
  }

  async function handleSave() {
    if (!editForm || !editAgente) return;
    setSaving(true);

    const payload = {
      agente_id:           editAgente.id,
      anio,
      mes,
      facturado:           editForm.facturado,
      objetivo_facturado:  editForm.objetivo_facturado,
      encargos:            editForm.encargos,
      objetivo_encargos:   editForm.objetivo_encargos,
      ventas:              editForm.ventas,
      objetivo_ventas:     editForm.objetivo_ventas,
      contactos:           editForm.contactos,
      objetivo_contactos:  editForm.objetivo_contactos,
      ...(editForm.id ? { id: editForm.id } : {}),
    };

    const { data, error } = await supabase
      .from("rendimiento")
      .upsert(payload, { onConflict: "agente_id,anio,mes" })
      .select()
      .single();

    if (!error) {
      setStatsMap((prev) => ({
        ...prev,
        [editAgente.id]: data ?? { ...editForm, agente_id: editAgente.id, anio, mes },
      }));
      setEditAgente(null);
      setEditForm(null);
    }
    setSaving(false);
  }

  // Summary totals from current period
  const totals = useMemo(() => {
    const vals = Object.values(statsMap);
    return {
      facturado: vals.reduce((s, v) => s + (v.facturado || 0), 0),
      encargos:  vals.reduce((s, v) => s + (v.encargos  || 0), 0),
      ventas:    vals.reduce((s, v) => s + (v.ventas    || 0), 0),
    };
  }, [statsMap]);

  function fmtEur(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M €`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K €`;
    return `${v} €`;
  }

  const yearOptions = [defaultAnio - 1, defaultAnio, defaultAnio + 1];

  return (
    <div className="space-y-6">

      {/* ── Period selector ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={anio}
          onChange={(e) => handlePeriod(Number(e.target.value), mes)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handlePeriod(anio, 0)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              mes === 0
                ? "bg-primary text-white"
                : "border border-border bg-surface text-text-secondary hover:bg-background"
            }`}
          >
            Todo el año
          </button>
          {MESES_LABEL.map((m, i) => (
            <button
              key={i}
              onClick={() => handlePeriod(anio, i + 1)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                mes === i + 1
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-text-secondary hover:bg-background"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent cards ─────────────────────────────────────────────── */}
      {agentes.length === 0 ? (
        <p className="text-sm text-text-secondary">No hay agentes registrados.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agentes.map((agente) => {
            const stats = statsMap[agente.id];
            return (
              <div key={agente.id} className="rounded-xl border border-border bg-surface p-5">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {agente.nombre[0]}{agente.apellidos[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {agente.nombre} {agente.apellidos}
                      </p>
                      <p className="text-xs text-text-secondary">{agente.puesto}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => openEdit(agente)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {/* Rings */}
                <div className="grid grid-cols-4 gap-1">
                  {METRICS.map(({ key, objKey, label, color, isCurrency }) => (
                    <Ring
                      key={key}
                      value={stats[key]}
                      objetivo={stats[objKey]}
                      color={color}
                      label={label}
                      isCurrency={isCurrency}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Resumen de Rendimiento ──────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary opacity-70">
          Resumen de Rendimiento
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Noticias",  value: String(totalNoticias),    dot: "var(--color-primary)"  },
            { label: "Encargos",  value: String(totals.encargos),  dot: "#7c3aed"               },
            { label: "Ventas",    value: String(totals.ventas),    dot: "var(--color-success)"  },
            { label: "Facturado", value: fmtEur(totals.facturado), dot: "var(--color-accent)"   },
          ].map(({ label, value, dot }) => (
            <div key={label} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />
                <p className="text-xs font-medium text-text-secondary">{label}</p>
              </div>
              <p className="text-2xl font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit modal ──────────────────────────────────────────────── */}
      {editAgente && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                {editAgente.nombre} {editAgente.apellidos}
              </h2>
              <button
                onClick={() => setEditAgente(null)}
                className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {METRICS.map(({ key, objKey, label, color }) => (
                <div key={key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-text-primary">{label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-text-secondary">Actual</label>
                      <input
                        type="number"
                        min={0}
                        value={editForm[key]}
                        onChange={(e) =>
                          setEditForm((f) => f ? { ...f, [key]: Number(e.target.value) } : f)
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-text-secondary">Objetivo</label>
                      <input
                        type="number"
                        min={0}
                        value={editForm[objKey]}
                        onChange={(e) =>
                          setEditForm((f) => f ? { ...f, [objKey]: Number(e.target.value) } : f)
                        }
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditAgente(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
