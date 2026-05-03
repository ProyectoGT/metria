"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  MapPin,
  Trophy,
  TrendingUp,
  Users,
  UserX,
  X,
} from "lucide-react";
import type { InsightsData } from "@/lib/insights";

type Props = {
  data: InsightsData;
  currentAnio: number;
  currentAgenteId: number | null;
  currentZonaId: number | null;
  currentDesde: string | null;
  currentHasta: string | null;
  role: string;
};

const MESES_LABEL = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ESTADO_STYLE: Record<string, string> = {
  noticia:       "bg-primary/10 text-primary",
  investigacion: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  seguimiento:   "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  encargo:       "bg-success/15 text-success",
  vendido:       "bg-success/20 text-success",
  neutral:       "bg-muted text-text-secondary",
};

// ─── Componentes internos ────────────────────────────────────────────────────

function InsufficientData() {
  return (
    <p className="py-6 text-center text-sm italic text-text-secondary">
      Datos insuficientes para mostrar este insight.
    </p>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary">
      <Icon className="h-5 w-5 text-primary" />
      {title}
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Bar({ value, max, color = "var(--color-primary)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function MiniBarChart({ values, labels, color = "var(--color-primary)" }: {
  values: number[];
  labels: string[];
  color?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1" style={{ height: 80 }}>
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{
              height: `${Math.max(4, Math.round((v / max) * 72))}px`,
              backgroundColor: v === 0 ? "var(--color-border)" : color,
              opacity: v === 0 ? 0.4 : 1,
            }}
            title={`${labels[i]}: ${v}`}
          />
          <span className="text-[9px] text-text-secondary">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function InsightsClient({
  data,
  currentAnio,
  currentAgenteId,
  currentZonaId,
  currentDesde,
  currentHasta,
  role,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const isAdminDir = role === "Administrador" || role === "Director";

  const push = useCallback(
    (overrides: {
      anio?: number;
      agente?: number | null;
      zona?: number | null;
      desde?: string | null;
      hasta?: string | null;
    }) => {
      const params = new URLSearchParams();
      const anio   = overrides.anio   ?? currentAnio;
      const agente = "agente" in overrides ? overrides.agente : currentAgenteId;
      const zona   = "zona"   in overrides ? overrides.zona   : currentZonaId;
      const desde  = "desde"  in overrides ? overrides.desde  : currentDesde;
      const hasta  = "hasta"  in overrides ? overrides.hasta  : currentHasta;

      params.set("anio", String(anio));
      if (agente) params.set("agente", String(agente));
      if (zona)   params.set("zona",   String(zona));
      if (desde)  params.set("desde",  desde);
      if (hasta)  params.set("hasta",  hasta);

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, currentAnio, currentAgenteId, currentZonaId, currentDesde, currentHasta],
  );

  const hasFilters = !!(currentAgenteId || currentZonaId || currentDesde || currentHasta);

  const {
    propiedadesPorEstado,
    totalPedidosActivos,
    zonasPedidos,
    zonasEncargos,
    propiedadesSinActividad,
    agentesConversion,
    agentesPedidosSinSeguimiento,
    rankingPropiedadesGestionadas,
    rankingTareasCompletadas,
    agenteSinResponsable,
    usuariosInactivosConPendientes,
    evolucionMensual,
    agentes,
    zonas,
  } = data;

  const yearOptions = [currentAnio - 2, currentAnio - 1, currentAnio, currentAnio + 1];
  const maxPedidos        = Math.max(...zonasPedidos.map((z) => z.pedidos_activos), 1);
  const maxEncargos       = Math.max(...zonasEncargos.map((z) => z.encargos), 1);
  const maxSinSeg         = Math.max(...agentesPedidosSinSeguimiento.map((a) => a.pedidos_sin_seguimiento), 1);
  const maxDias           = Math.max(...propiedadesSinActividad.map((p) => p.dias_inactiva), 1);
  const maxPropGest       = Math.max(...rankingPropiedadesGestionadas.map((a) => a.valor), 1);
  const maxTareasComp     = Math.max(...rankingTareasCompletadas.map((a) => a.valor), 1);

  return (
    <div className="space-y-8">

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Año */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">Año</label>
            <select
              value={currentAnio}
              onChange={(e) => push({ anio: Number(e.target.value) })}
              className="input w-auto text-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Desde */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">Desde</label>
            <input
              type="date"
              value={currentDesde ?? ""}
              onChange={(e) => push({ desde: e.target.value || null })}
              className="input text-sm"
            />
          </div>

          {/* Hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">Hasta</label>
            <input
              type="date"
              value={currentHasta ?? ""}
              onChange={(e) => push({ hasta: e.target.value || null })}
              className="input text-sm"
            />
          </div>

          {/* Agente */}
          {agentes.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary">Agente</label>
              <select
                value={currentAgenteId ?? ""}
                onChange={(e) => push({ agente: e.target.value ? Number(e.target.value) : null })}
                className="input w-auto text-sm"
              >
                <option value="">Todos los agentes</option>
                {agentes.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Zona */}
          {zonas.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-secondary">Zona</label>
              <select
                value={currentZonaId ?? ""}
                onChange={(e) => push({ zona: e.target.value ? Number(e.target.value) : null })}
                className="input w-auto text-sm"
              >
                <option value="">Todas las zonas</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>{z.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Limpiar filtros */}
          {hasFilters && (
            <button
              onClick={() => push({ agente: null, zona: null, desde: null, hasta: null })}
              className="flex items-center gap-1.5 self-end rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-danger"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Resumen rápido ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

        {/* Total pedidos activos */}
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-bold text-primary">{totalPedidosActivos}</p>
          <p className="mt-1 text-xs text-text-secondary">Pedidos activos</p>
        </Card>

        {/* Propiedades por estado */}
        {propiedadesPorEstado.length === 0 ? (
          <Card className="col-span-2 flex flex-col items-center justify-center text-center sm:col-span-2">
            <p className="text-xs italic text-text-secondary">Sin propiedades</p>
          </Card>
        ) : (
          propiedadesPorEstado.map(({ estado, total }) => (
            <Card key={estado} className="flex flex-col items-center justify-center text-center">
              <p className="text-2xl font-bold text-text-primary">{total}</p>
              <span
                className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                  ESTADO_STYLE[estado] ?? "bg-muted text-text-secondary"
                }`}
              >
                {estado}
              </span>
            </Card>
          ))
        )}
      </div>

      {/* ── Alertas (solo admin/director) ──────────────────────────────────── */}
      {isAdminDir && (agenteSinResponsable.length > 0 || usuariosInactivosConPendientes.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {agenteSinResponsable.length > 0 && (
            <Card>
              <SectionTitle icon={UserX} title="Agentes sin responsable asignado" />
              <div className="space-y-2">
                {agenteSinResponsable.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{u.nombre}</p>
                      <p className="text-xs text-text-secondary">{u.correo}</p>
                    </div>
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Sin responsable</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {usuariosInactivosConPendientes.length > 0 && (
            <Card>
              <SectionTitle icon={AlertTriangle} title="Usuarios inactivos con pendientes" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      <th className="pb-2">Usuario</th>
                      <th className="pb-2 text-center">Tareas</th>
                      <th className="pb-2 text-center">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usuariosInactivosConPendientes.map((u) => (
                      <tr key={u.id} className="hover:bg-background">
                        <td className="py-2">
                          <p className="font-medium text-text-primary">{u.nombre}</p>
                          <p className="text-xs text-text-secondary">{u.correo}</p>
                        </td>
                        <td className="py-2 text-center">
                          {u.tareas_abiertas > 0
                            ? <span className="font-semibold text-amber-600 dark:text-amber-400">{u.tareas_abiertas}</span>
                            : <span className="text-text-secondary">—</span>}
                        </td>
                        <td className="py-2 text-center">
                          {u.pedidos_abiertos > 0
                            ? <span className="font-semibold text-danger">{u.pedidos_abiertos}</span>
                            : <span className="text-text-secondary">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Rankings ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <Card>
          <SectionTitle icon={Trophy} title="Ranking: propiedades gestionadas" />
          {rankingPropiedadesGestionadas.length === 0 ? <InsufficientData /> : (
            <div className="space-y-3">
              {rankingPropiedadesGestionadas.map((a, i) => (
                <div key={a.agente_id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${i === 0 ? "bg-amber-400/20 text-amber-600" : i === 1 ? "bg-slate-400/20 text-slate-500" : i === 2 ? "bg-orange-400/20 text-orange-600" : "bg-muted text-text-secondary"}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-text-primary">{a.agente_nombre}</span>
                    </div>
                    <span className="font-semibold text-primary">{a.valor}</span>
                  </div>
                  <Bar value={a.valor} max={maxPropGest} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={Trophy} title="Ranking: tareas completadas" />
          {rankingTareasCompletadas.length === 0 ? <InsufficientData /> : (
            <div className="space-y-3">
              {rankingTareasCompletadas.map((a, i) => (
                <div key={a.agente_id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${i === 0 ? "bg-amber-400/20 text-amber-600" : i === 1 ? "bg-slate-400/20 text-slate-500" : i === 2 ? "bg-orange-400/20 text-orange-600" : "bg-muted text-text-secondary"}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-text-primary">{a.agente_nombre}</span>
                    </div>
                    <span className="font-semibold text-success">{a.valor}</span>
                  </div>
                  <Bar value={a.valor} max={maxTareasComp} color="var(--color-success)" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Zonas ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={MapPin} title="Zonas con mas pedidos activos" />
          {zonasPedidos.length === 0 ? <InsufficientData /> : (
            <div className="space-y-3">
              {zonasPedidos.map((z) => (
                <div key={z.zona_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{z.zona_nombre}</span>
                    <span className="font-semibold text-primary">{z.pedidos_activos}</span>
                  </div>
                  <Bar value={z.pedidos_activos} max={maxPedidos} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={MapPin} title="Zonas con mas propiedades en encargo" />
          {zonasEncargos.length === 0 ? <InsufficientData /> : (
            <div className="space-y-3">
              {zonasEncargos.map((z) => (
                <div key={z.zona_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{z.zona_nombre}</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{z.encargos}</span>
                  </div>
                  <Bar value={z.encargos} max={maxEncargos} color="#7c3aed" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Propiedades sin actividad ──────────────────────────────────────── */}
      <Card>
        <SectionTitle icon={AlertTriangle} title="Propiedades sin actividad reciente" />
        {propiedadesSinActividad.length === 0 ? (
          <p className="py-6 text-center text-sm text-success">Todas las propiedades tienen actividad reciente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  <th className="px-4 py-2">Propiedad</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Agente</th>
                  <th className="px-4 py-2 text-right">Dias inactiva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {propiedadesSinActividad.map((p) => (
                  <tr key={p.id} className="hover:bg-background">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{p.label}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${ESTADO_STYLE[p.estado.toLowerCase()] ?? "bg-muted text-text-secondary"}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{p.agente_nombre ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-semibold ${p.dias_inactiva >= 30 ? "text-danger" : "text-amber-600 dark:text-amber-400"}`}>
                          {p.dias_inactiva}d
                        </span>
                        <Bar value={p.dias_inactiva} max={maxDias} color={p.dias_inactiva >= 30 ? "var(--color-danger)" : "#f59e0b"} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Conversión + Pedidos sin seguimiento ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={TrendingUp} title="Conversion encargo → venta" />
          {agentesConversion.every((a) => a.encargos === 0) ? <InsufficientData /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <th className="pb-2">Agente</th>
                    <th className="pb-2 text-center">Encargos</th>
                    <th className="pb-2 text-center">Ventas</th>
                    <th className="pb-2 text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agentesConversion.map((a) => (
                    <tr key={a.agente_id} className="hover:bg-background">
                      <td className="py-2.5 font-medium text-text-primary">{a.agente_nombre}</td>
                      <td className="py-2.5 text-center text-text-secondary">{a.encargos}</td>
                      <td className="py-2.5 text-center text-text-secondary">{a.ventas}</td>
                      <td className="py-2.5 text-right">
                        {a.tasa_conversion === null
                          ? <span className="text-xs italic text-text-secondary">—</span>
                          : <span className={`font-semibold ${a.tasa_conversion >= 50 ? "text-success" : a.tasa_conversion >= 25 ? "text-amber-600 dark:text-amber-400" : "text-text-primary"}`}>
                              {a.tasa_conversion}%
                            </span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={Users} title="Pedidos sin seguimiento por agente" />
          {agentesPedidosSinSeguimiento.length === 0 ? (
            <p className="py-6 text-center text-sm text-success">Todos los pedidos tienen seguimiento reciente.</p>
          ) : (
            <div className="space-y-3">
              {agentesPedidosSinSeguimiento.map((a) => (
                <div key={a.agente_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{a.agente_nombre}</span>
                    <span className={`font-semibold ${a.pedidos_sin_seguimiento >= 5 ? "text-danger" : "text-amber-600 dark:text-amber-400"}`}>
                      {a.pedidos_sin_seguimiento}
                    </span>
                  </div>
                  <Bar value={a.pedidos_sin_seguimiento} max={maxSinSeg} color={a.pedidos_sin_seguimiento >= 5 ? "var(--color-danger)" : "#f59e0b"} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Evolución mensual ──────────────────────────────────────────────── */}
      <Card>
        <SectionTitle icon={BarChart3} title={`Evolucion mensual ${currentAnio}`} />
        {evolucionMensual.every((m) => m.encargos === 0 && m.ventas === 0 && m.contactos === 0 && m.pedidos === 0)
          ? <InsufficientData />
          : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  { key: "contactos" as const, label: "Contactos", color: "var(--color-primary)" },
                  { key: "pedidos"   as const, label: "Pedidos",   color: "#7c3aed" },
                  { key: "encargos"  as const, label: "Encargos",  color: "var(--color-accent)" },
                  { key: "ventas"    as const, label: "Ventas",    color: "var(--color-success)" },
                ] as const
              ).map(({ key, label, color }) => {
                const values = evolucionMensual.map((m) => m[key]);
                const total = values.reduce((s, v) => s + v, 0);
                return (
                  <div key={key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">{label}</span>
                      <span className="text-xs font-semibold" style={{ color }}>{total} total</span>
                    </div>
                    <MiniBarChart values={values} labels={MESES_LABEL} color={color} />
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>

      {/* ── Tabla evolución ────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle icon={ClipboardList} title="Tabla de evolucion mensual" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-2">Mes</th>
                <th className="px-4 py-2 text-center">Contactos</th>
                <th className="px-4 py-2 text-center">Pedidos</th>
                <th className="px-4 py-2 text-center">Encargos</th>
                <th className="px-4 py-2 text-center">Ventas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {evolucionMensual.map((m) => {
                const isEmpty = m.contactos === 0 && m.pedidos === 0 && m.encargos === 0 && m.ventas === 0;
                return (
                  <tr key={m.mes} className={`hover:bg-background ${isEmpty ? "opacity-40" : ""}`}>
                    <td className="px-4 py-2 font-medium text-text-primary">{m.mes_label}</td>
                    <td className="px-4 py-2 text-center text-text-secondary">{m.contactos || "—"}</td>
                    <td className="px-4 py-2 text-center text-text-secondary">{m.pedidos || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      {m.encargos > 0 ? <span className="font-medium text-amber-600 dark:text-amber-400">{m.encargos}</span> : "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {m.ventas > 0 ? <span className="font-semibold text-success">{m.ventas}</span> : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-muted font-semibold">
                <td className="px-4 py-2 text-xs uppercase tracking-wide text-text-secondary">Total</td>
                {(["contactos", "pedidos", "encargos", "ventas"] as const).map((k) => (
                  <td key={k} className="px-4 py-2 text-center text-text-primary">
                    {evolucionMensual.reduce((s, m) => s + m[k], 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
