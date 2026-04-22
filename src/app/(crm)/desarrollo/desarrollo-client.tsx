"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  defaultRendimiento,
  getPeriodRange,
  mergeRendimientoRows,
  mergeRendimientoRowsAnual,
  type ObjectiveKey,
  type RendimientoPeriodo,
} from "@/lib/desarrollo-metrics";
import { updateObjetivosRendimientoAction } from "./actions";

type Agente = {
  id: number;
  nombre: string;
  apellidos: string;
  rol: string;
  rendimiento: RendimientoPeriodo | null;
};

type Props = {
  agentes: Agente[];
  totalNoticias: number;
  canManageObjectives: boolean;
  defaultAnio: number;
  role: string;
};

const MESES_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ALL_METRICS = [
  {
    key: "contactos" as const,
    objKey: "objetivo_contactos" as const,
    label: "Contactos",
    color: "var(--color-primary)",
    isCurrency: false,
    adminOnly: false,
  },
  {
    key: "encargos" as const,
    objKey: "objetivo_encargos" as const,
    label: "Encargos",
    color: "#7c3aed",
    isCurrency: false,
    adminOnly: false,
  },
  {
    key: "ventas" as const,
    objKey: "objetivo_ventas" as const,
    label: "Ventas",
    color: "var(--color-success)",
    isCurrency: false,
    adminOnly: false,
  },
  {
    key: "facturado" as const,
    objKey: "objetivo_facturado" as const,
    label: "Facturado",
    color: "var(--color-accent)",
    isCurrency: true,
    adminOnly: true,
  },
] as const;

function fmtNum(v: number, isCurrency: boolean): string {
  if (!isCurrency) return String(v);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M €`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K €`;
  return `${v} €`;
}

function pct(value: number, obj: number) {
  if (obj <= 0) return 0;
  return Math.min(Math.round((value / obj) * 100), 100);
}

function ProgressBar({ value, objetivo, color }: { value: number; objetivo: number; color: string }) {
  const p = pct(value, objetivo);
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${p}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function DesarrolloClient({
  agentes,
  totalNoticias,
  canManageObjectives,
  defaultAnio,
  role,
}: Props) {
  const canSeeFacturado = role === "Administrador" || role === "Director";
  const METRICS = ALL_METRICS.filter((m) => !m.adminOnly || canSeeFacturado);
  const supabase = useMemo(() => createClient(), []);

  const [anio, setAnio] = useState(defaultAnio);
  const [mes, setMes] = useState(0);
  const [statsMap, setStatsMap] = useState<Record<number, RendimientoPeriodo>>(() =>
    Object.fromEntries(
      agentes.map((a) => [
        a.id,
        a.rendimiento ?? defaultRendimiento(a.id, defaultAnio, 0),
      ]),
    ),
  );
  const [editAgente, setEditAgente] = useState<Agente | null>(null);
  const [editForm, setEditForm] = useState<RendimientoPeriodo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchStats = useCallback(
    async (newAnio: number, newMes: number) => {
      const range = getPeriodRange(newAnio, newMes);
      const [{ data: objetivos }, { data: actividades }] = await Promise.all([
        newMes === 0
          ? supabase.from("rendimiento").select("*").eq("anio", newAnio).gte("mes", 1).lte("mes", 12)
          : supabase.from("rendimiento").select("*").eq("anio", newAnio).eq("mes", newMes),
        supabase
          .from("actividad_desarrollo")
          .select("agente_id, metric, value")
          .gte("occurred_at", range.from)
          .lt("occurred_at", range.to),
      ]);

      if (newMes === 0) {
        setStatsMap(
          mergeRendimientoRowsAnual({
            agentes,
            objetivos: objetivos ?? [],
            actividades: actividades ?? [],
            anio: newAnio,
          }),
        );
      } else {
        setStatsMap(
          mergeRendimientoRows({
            agentes,
            objetivos: objetivos ?? [],
            actividades: actividades ?? [],
            anio: newAnio,
            mes: newMes,
          }),
        );
      }
    },
    [agentes, supabase],
  );

  function handlePeriod(newAnio: number, newMes: number) {
    setAnio(newAnio);
    setMes(newMes);
    fetchStats(newAnio, newMes);
  }

  function openEdit(agente: Agente) {
    if (!canManageObjectives) return;
    setEditAgente(agente);
    const current = statsMap[agente.id] ?? defaultRendimiento(agente.id, anio, mes);
    if (mes === 0) {
      // En vista anual, mostrar el objetivo mensual (anual / 12)
      setEditForm({
        ...current,
        objetivo_facturado: Math.round(current.objetivo_facturado / 12),
        objetivo_encargos:  Math.round(current.objetivo_encargos  / 12),
        objetivo_ventas:    Math.round(current.objetivo_ventas    / 12),
        objetivo_contactos: Math.round(current.objetivo_contactos / 12),
      });
    } else {
      setEditForm(current);
    }
    setSaveError(null);
  }

  function updateObjective(key: ObjectiveKey, value: string) {
    setEditForm((current) =>
      current ? { ...current, [key]: Number(value) } : current,
    );
  }

  async function handleSave() {
    if (!editForm || !editAgente) return;
    setSaving(true);
    setSaveError(null);
    try {
      // En vista anual editForm contiene los valores mensuales que se aplicarán a cada mes
      await updateObjetivosRendimientoAction({
        agenteId: editAgente.id,
        anio,
        mes,
        objetivo_facturado: editForm.objetivo_facturado,
        objetivo_encargos: editForm.objetivo_encargos,
        objetivo_ventas: editForm.objetivo_ventas,
        objetivo_contactos: editForm.objetivo_contactos,
      });

      // Actualizar el statsMap local
      if (mes === 0) {
        // En anual: el objetivo mostrado = mensual × 12
        setStatsMap((prev) => ({
          ...prev,
          [editAgente.id]: {
            ...(prev[editAgente.id] ?? defaultRendimiento(editAgente.id, anio, mes)),
            objetivo_facturado: editForm.objetivo_facturado * 12,
            objetivo_encargos: editForm.objetivo_encargos * 12,
            objetivo_ventas: editForm.objetivo_ventas * 12,
            objetivo_contactos: editForm.objetivo_contactos * 12,
          },
        }));
      } else {
        setStatsMap((prev) => ({
          ...prev,
          [editAgente.id]: {
            ...(prev[editAgente.id] ?? defaultRendimiento(editAgente.id, anio, mes)),
            objetivo_facturado: editForm.objetivo_facturado,
            objetivo_encargos: editForm.objetivo_encargos,
            objetivo_ventas: editForm.objetivo_ventas,
            objetivo_contactos: editForm.objetivo_contactos,
          },
        }));
      }
      setEditAgente(null);
      setEditForm(null);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudieron guardar los objetivos.",
      );
    }
    setSaving(false);
  }

  const totals = useMemo(() => {
    const vals = Object.values(statsMap);
    return {
      facturado: vals.reduce((s, v) => s + (v.facturado || 0), 0),
      encargos: vals.reduce((s, v) => s + (v.encargos || 0), 0),
      ventas: vals.reduce((s, v) => s + (v.ventas || 0), 0),
      contactos: vals.reduce((s, v) => s + (v.contactos || 0), 0),
    };
  }, [statsMap]);

  const yearOptions = [defaultAnio - 1, defaultAnio, defaultAnio + 1];

  const summaryCards = [
    { label: "Noticias", value: String(totalNoticias), color: "var(--color-primary)" },
    { label: "Encargos", value: String(totals.encargos), color: "#7c3aed" },
    { label: "Ventas", value: String(totals.ventas), color: "var(--color-success)" },
    ...(canSeeFacturado
      ? [{ label: "Facturado", value: fmtNum(totals.facturado, true), color: "var(--color-accent)" }]
      : []),
  ];

  return (
    <div className="space-y-6">

      {/* ── Resumen de rendimiento ─────────────────────────────────── */}
      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${canSeeFacturado ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {summaryCards.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-3 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <p className="text-xs font-medium text-text-secondary">{label}</p>
            </div>
            <p className="text-xl font-bold text-text-primary sm:text-2xl">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={anio}
          onChange={(e) => handlePeriod(Number(e.target.value), mes)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={mes}
          onChange={(e) => handlePeriod(anio, Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={0}>Todo el año</option>
          {MESES_LABEL.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {/* ── Tabla tipo Excel ────────────────────────────────────────── */}
      {agentes.length === 0 ? (
        <p className="text-sm text-text-secondary">No hay agentes registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Agente
                </th>
                {METRICS.map(({ label, color }) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-secondary"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentes.map((agente, idx) => {
                const stats = statsMap[agente.id] ?? defaultRendimiento(agente.id, anio, mes);
                const isLast = idx === agentes.length - 1;

                return (
                  <tr
                    key={agente.id}
                    className={`transition-colors hover:bg-muted ${!isLast ? "border-b border-border" : ""}`}
                  >
                    {/* Agente */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {agente.nombre[0]}{agente.apellidos[0]}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">
                            {agente.nombre} {agente.apellidos}
                          </p>
                          <p className="text-xs text-text-secondary">{agente.rol}</p>
                        </div>
                        {canManageObjectives && (
                          <button
                            onClick={() => openEdit(agente)}
                            className="ml-auto shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                          >
                            Objetivos
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Métricas */}
                    {METRICS.map(({ key, objKey, color, isCurrency }) => {
                      const val = stats[key];
                      const obj = stats[objKey];
                      const p = pct(val, obj);

                      return (
                        <td key={key} className="px-4 py-3 text-center">
                          <p className="font-semibold text-text-primary">
                            {fmtNum(val, isCurrency)}
                          </p>
                          <p className="text-xs text-text-secondary">
                            obj. {fmtNum(obj, isCurrency)}
                          </p>
                          <ProgressBar value={val} objetivo={obj} color={color} />
                          <p className="mt-0.5 text-[11px] text-text-secondary">{p}%</p>
                        </td>
                      );
                    })}

                  </tr>
                );
              })}

              {/* Fila totales */}
              {agentes.length > 1 && (
                <tr className="border-t-2 border-border bg-muted font-semibold">
                  <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
                    Total
                  </td>
                  {METRICS.map(({ key, isCurrency, color }) => (
                    <td key={key} className="px-4 py-3 text-center">
                      <p className="font-bold text-text-primary" style={{ color }}>
                        {fmtNum(totals[key], isCurrency)}
                      </p>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de objetivos ──────────────────────────────────────── */}
      {editAgente && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                Objetivos — {editAgente.nombre} {editAgente.apellidos}
              </h2>
              <button
                onClick={() => setEditAgente(null)}
                className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {mes === 0 ? (
              <p className="mb-4 rounded-lg bg-primary/8 px-3 py-2 text-xs text-primary">
                Vista anual — los objetivos mensuales se aplicaran a los 12 meses del ano {anio}. El objetivo anual es la suma de los 12 meses.
              </p>
            ) : (
              <p className="mb-4 text-xs text-text-secondary">
                {MESES_LABEL[mes - 1]} {anio}
              </p>
            )}

            {/* Cabeceras */}
            <div className={`mb-2 grid gap-3 text-xs font-semibold uppercase tracking-wide text-text-secondary ${mes === 0 ? "grid-cols-4" : "grid-cols-3"}`}>
              <span>Metrica</span>
              <span className="text-center">Actual</span>
              <span className="text-center">{mes === 0 ? "Obj. mensual" : "Objetivo"}</span>
              {mes === 0 && <span className="text-center">Total anual</span>}
            </div>

            <div className="space-y-3">
              {METRICS.map(({ key, objKey, label, color, isCurrency }) => (
                <div key={key} className={`grid items-center gap-3 ${mes === 0 ? "grid-cols-4" : "grid-cols-3"}`}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                  </div>
                  <div className="input flex items-center justify-center bg-background text-sm text-text-secondary">
                    {fmtNum(editForm[key], isCurrency)}
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={editForm[objKey]}
                    onChange={(e) => updateObjective(objKey as ObjectiveKey, e.target.value)}
                    className="input text-center"
                  />
                  {mes === 0 && (
                    <div className="flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-text-primary">
                      {fmtNum(editForm[objKey] * 12, isCurrency)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {saveError && (
              <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                {saveError}
              </p>
            )}

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
                {saving ? "Guardando..." : mes === 0 ? "Aplicar a todos los meses" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
