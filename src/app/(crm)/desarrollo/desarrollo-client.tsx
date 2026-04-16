"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  defaultRendimiento,
  getPeriodRange,
  mergeRendimientoRows,
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
};

const MESES_LABEL = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const RADIUS = 38;
const CIRC = 2 * Math.PI * RADIUS;

const METRICS = [
  {
    key: "facturado",
    objKey: "objetivo_facturado",
    label: "Facturado",
    color: "var(--color-primary)",
    isCurrency: true,
  },
  {
    key: "encargos",
    objKey: "objetivo_encargos",
    label: "Encargos",
    color: "#7c3aed",
    isCurrency: false,
  },
  {
    key: "ventas",
    objKey: "objetivo_ventas",
    label: "Ventas",
    color: "var(--color-success)",
    isCurrency: false,
  },
  {
    key: "contactos",
    objKey: "objetivo_contactos",
    label: "Contactos",
    color: "var(--color-accent)",
    isCurrency: false,
  },
] as const;

function fmtNum(v: number, isCurrency: boolean): string {
  if (!isCurrency) return String(v);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtEur(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M EUR`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K EUR`;
  return `${v} EUR`;
}

function Ring({
  value,
  objetivo,
  color,
  label,
  isCurrency,
}: {
  value: number;
  objetivo: number;
  color: string;
  label: string;
  isCurrency: boolean;
}) {
  const pct = objetivo > 0 ? Math.min(value / objetivo, 1) : 0;
  const offset = CIRC * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[84px] w-[84px]">
        <svg className="h-[84px] w-[84px] -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="7"
            style={{ stroke: "var(--color-border)" }}
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ stroke: color, transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[13px] font-bold leading-none text-text-primary">
            {fmtNum(value, isCurrency)}
          </span>
          <span className="mt-0.5 text-[10px] leading-tight text-text-secondary">
            /{fmtNum(objetivo, isCurrency)}
          </span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}

export default function DesarrolloClient({
  agentes,
  totalNoticias,
  canManageObjectives,
  defaultAnio,
}: Props) {
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
        supabase
          .from("rendimiento")
          .select("*")
          .eq("anio", newAnio)
          .eq("mes", newMes),
        supabase
          .from("actividad_desarrollo")
          .select("agente_id, metric, value")
          .gte("occurred_at", range.from)
          .lt("occurred_at", range.to),
      ]);

      setStatsMap(
        mergeRendimientoRows({
          agentes,
          objetivos: objetivos ?? [],
          actividades: actividades ?? [],
          anio: newAnio,
          mes: newMes,
        }),
      );
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
    setEditForm(statsMap[agente.id] ?? defaultRendimiento(agente.id, anio, mes));
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
      const data = await updateObjetivosRendimientoAction({
        agenteId: editAgente.id,
        anio,
        mes,
        objetivo_facturado: editForm.objetivo_facturado,
        objetivo_encargos: editForm.objetivo_encargos,
        objetivo_ventas: editForm.objetivo_ventas,
        objetivo_contactos: editForm.objetivo_contactos,
      });

      setStatsMap((prev) => ({
        ...prev,
        [editAgente.id]: {
          ...(prev[editAgente.id] ?? defaultRendimiento(editAgente.id, anio, mes)),
          id: data.id,
          objetivo_facturado: data.objetivo_facturado,
          objetivo_encargos: data.objetivo_encargos,
          objetivo_ventas: data.objetivo_ventas,
          objetivo_contactos: data.objetivo_contactos,
        },
      }));
      setEditAgente(null);
      setEditForm(null);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los objetivos.",
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
    };
  }, [statsMap]);

  const yearOptions = [defaultAnio - 1, defaultAnio, defaultAnio + 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={anio}
          onChange={(e) => handlePeriod(Number(e.target.value), mes)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
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
            Todo el ano
          </button>
          {MESES_LABEL.map((m, i) => (
            <button
              key={m}
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

      {agentes.length === 0 ? (
        <p className="text-sm text-text-secondary">No hay agentes registrados.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agentes.map((agente) => {
            const stats = statsMap[agente.id] ?? defaultRendimiento(agente.id, anio, mes);

            return (
              <div key={agente.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {agente.nombre[0]}
                      {agente.apellidos[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {agente.nombre} {agente.apellidos}
                      </p>
                      <p className="text-xs text-text-secondary">{agente.rol}</p>
                    </div>
                  </div>
                  {canManageObjectives && (
                    <button
                      onClick={() => openEdit(agente)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                    >
                      Objetivos
                    </button>
                  )}
                </div>

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

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary opacity-70">
          Resumen de Rendimiento
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Noticias", value: String(totalNoticias), dot: "var(--color-primary)" },
            { label: "Encargos", value: String(totals.encargos), dot: "#7c3aed" },
            { label: "Ventas", value: String(totals.ventas), dot: "var(--color-success)" },
            { label: "Facturado", value: fmtEur(totals.facturado), dot: "var(--color-accent)" },
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
                aria-label="Cerrar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {METRICS.map(({ key, objKey, label, color, isCurrency }) => (
                <div key={key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-text-primary">{label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-text-secondary">Actual</label>
                      <div className="input flex items-center bg-background text-sm text-text-secondary">
                        {fmtNum(editForm[key], isCurrency)}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-text-secondary">Objetivo</label>
                      <input
                        type="number"
                        min={0}
                        value={editForm[objKey]}
                        onChange={(e) => updateObjective(objKey as ObjectiveKey, e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>
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
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
