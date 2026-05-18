"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  MessageCircle, Clock, Check, CheckCheck,
  AlertCircle, Wifi, WifiOff, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { getComunicacionesAction, type ComunicacionesMetrics, type ComunicacionesRow } from "@/app/(crm)/whatsapp/actions";
import FilterBar from "@/components/ui/filters/FilterBar";
import FilterSearch from "@/components/ui/filters/FilterSearch";
import FilterSelect from "@/components/ui/filters/FilterSelect";
import FilterDateRange from "@/components/ui/filters/FilterDateRange";
import FilterDrawer from "@/components/ui/filters/FilterDrawer";

type Props = {
  metrics: ComunicacionesMetrics;
  agentes: Array<{ id: number; nombre: string; apellidos: string }>;
  currentUserRole: string;
  currentUserId: number;
  apiEnabled: boolean;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  prepared: { label: "Manual",    color: "bg-surface-raised text-text-secondary",            icon: <Clock className="h-3 w-3" /> },
  sent:     { label: "Enviado",   color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",  icon: <Check className="h-3 w-3" /> },
  delivered:{ label: "Entregado", color: "bg-primary/10 text-primary",                        icon: <CheckCheck className="h-3 w-3" /> },
  read:     { label: "Leido",     color: "bg-success/10 text-success",                        icon: <CheckCheck className="h-3 w-3" /> },
  failed:   { label: "Fallido",   color: "bg-danger/10 text-danger",                          icon: <AlertCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.prepared;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-3xl font-bold text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const PAGE_SIZE = 30;

export default function ComunicacionesClient({ metrics, agentes, currentUserRole, apiEnabled }: Props) {
  const [rows, setRows]       = useState<ComunicacionesRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loaded, setLoaded]   = useState(false);
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [busqueda,   setBusqueda]   = useState("");
  const [agenteId,   setAgenteId]   = useState<number | undefined>();
  const [estado,     setEstado]     = useState("");
  const [tipo,       setTipo]       = useState<"solicitud" | "propiedad" | "">("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const isManager = currentUserRole === "Administrador" || currentUserRole === "Director";
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback((p: number = 1) => {
    startTransition(async () => {
      const result = await getComunicacionesAction({
        busqueda:   busqueda || undefined,
        agenteId:   agenteId,
        estado:     estado || undefined,
        tipo:       (tipo as "solicitud" | "propiedad") || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        page:       p,
        pageSize:   PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
      setPage(p);
      setLoaded(true);
    });
  }, [busqueda, agenteId, estado, tipo, fechaDesde, fechaHasta]);

  return (
    <div className="space-y-5">
      {/* Banner API */}
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3 ${apiEnabled ? "border-success/30 bg-success/10" : "border-warning/30 bg-warning/10"}`}>
        {apiEnabled
          ? <><Wifi className="h-4 w-4 shrink-0 text-success" /><p className="text-sm font-medium text-success">WhatsApp Cloud API activa — envios automaticos habilitados</p></>
          : <><WifiOff className="h-4 w-4 shrink-0 text-warning" /><p className="text-sm font-medium text-warning">API no configurada — modo manual (wa.me). Añade las credenciales en <code className="rounded bg-warning/10 px-1 text-xs">.env.local</code> para activar envios automaticos.</p></>
        }
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Hoy"     value={metrics.totalHoy}    sub="mensajes enviados" />
        <MetricCard label="Semana"  value={metrics.totalSemana} sub="ultimos 7 dias" />
        <MetricCard label="Mes"     value={metrics.totalMes}    sub="este mes" />
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Por estado</p>
          <div className="mt-2 space-y-1">
            {Object.entries(metrics.porEstado).map(([s, n]) => (
              <div key={s} className="flex items-center justify-between gap-2">
                <StatusBadge status={s} />
                <span className="text-xs font-bold text-text-primary">{n}</span>
              </div>
            ))}
            {Object.keys(metrics.porEstado).length === 0 && (
              <p className="text-xs text-text-secondary">Sin datos este mes</p>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FilterBar
        searchSlot={
          <FilterSearch
            value={busqueda}
            onChange={(v) => { setBusqueda(v); load(1); }}
            placeholder="Nombre o telefono..."
            className="min-w-[160px] flex-1"
          />
        }
        activeCount={(() => {
          let c = 0;
          if (busqueda) c++;
          if (estado) c++;
          if (tipo) c++;
          if (agenteId) c++;
          if (fechaDesde) c++;
          if (fechaHasta) c++;
          return c;
        })()}
        onClear={() => {
          setBusqueda(""); setEstado(""); setTipo("");
          setAgenteId(undefined); setFechaDesde(""); setFechaHasta("");
          load(1);
        }}
        onOpenAdvanced={() => setDrawerOpen(true)}
        advancedCount={(() => {
          let c = 0;
          if (agenteId) c++;
          if (fechaDesde || fechaHasta) c++;
          return c;
        })()}
        chips={(() => {
          const c: { key: string; label: string; onRemove: () => void }[] = [];
          if (estado) c.push({ key: "estado", label: `Estado: ${estado}`, onRemove: () => { setEstado(""); load(1); } });
          if (tipo) c.push({ key: "tipo", label: `Tipo: ${tipo}`, onRemove: () => { setTipo(""); load(1); } });
          if (agenteId) {
            const a = agentes.find((x) => x.id === agenteId);
            c.push({ key: "agente", label: `Agente: ${a?.nombre ?? agenteId}`, onRemove: () => { setAgenteId(undefined); load(1); } });
          }
          if (fechaDesde) c.push({ key: "fdesde", label: `Desde: ${fechaDesde}`, onRemove: () => { setFechaDesde(""); load(1); } });
          if (fechaHasta) c.push({ key: "fhasta", label: `Hasta: ${fechaHasta}`, onRemove: () => { setFechaHasta(""); load(1); } });
          return c;
        })()}
      >
        <FilterSelect
          value={estado}
          onChange={(e) => { setEstado(e.target.value); load(1); }}
          label="Estado"
        >
          <option value="">Todos los estados</option>
          <option value="prepared">Manual</option>
          <option value="sent">Enviado</option>
          <option value="delivered">Entregado</option>
          <option value="read">Leido</option>
          <option value="failed">Fallido</option>
        </FilterSelect>

        <FilterSelect
          value={tipo}
          onChange={(e) => { setTipo(e.target.value as "solicitud" | "propiedad" | ""); load(1); }}
          label="Tipo"
        >
          <option value="">Todos los tipos</option>
          <option value="solicitud">Solicitud</option>
          <option value="propiedad">Propiedad</option>
        </FilterSelect>

        {loaded && (
          <button
            type="button"
            onClick={() => load(page)}
            disabled={isPending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-60"
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          </button>
        )}
      </FilterBar>

      {/* Drawer avanzados */}
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filtros avanzados"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setAgenteId(undefined); setFechaDesde(""); setFechaHasta(""); load(1); }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
            >
              Limpiar avanzados
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Cerrar
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {isManager && agentes.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Agente</label>
              <FilterSelect
                value={agenteId ?? ""}
                onChange={(e) => { setAgenteId(e.target.value ? Number(e.target.value) : undefined); load(1); }}
              >
                <option value="">Todos los agentes</option>
                {agentes.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.apellidos}</option>
                ))}
              </FilterSelect>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Fecha</label>
            <FilterDateRange
              valueFrom={fechaDesde}
              valueTo={fechaHasta}
              onChangeFrom={(v) => { setFechaDesde(v); load(1); }}
              onChangeTo={(v) => { setFechaHasta(v); load(1); }}
              labelFrom=""
              labelTo=""
            />
          </div>
        </div>
      </FilterDrawer>

      {/* Tabla */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        {!loaded ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-text-secondary">
            <MessageCircle className="h-10 w-10 opacity-30" />
            <p className="text-sm">Usa el filtro para cargar el historial de comunicaciones</p>
            <button
              type="button"
              onClick={() => load(1)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              Cargar todo
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
            Sin mensajes con los filtros aplicados
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Destinatario</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Mensaje</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Estado</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Tipo</th>
                    {isManager && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Agente</th>}
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-background">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{row.recipient_name ?? "—"}</p>
                        <p className="text-xs text-text-secondary">{row.phone}</p>
                      </td>
                      <td className="max-w-[300px] px-4 py-3">
                        <p className="line-clamp-2 text-xs text-text-secondary">{row.message_body}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        {row.related_type && row.related_id ? (
                          <Link
                            href={row.related_type === "solicitud"
                              ? `/solicitudes/${row.related_id}`
                              : `/propiedades/${row.related_id}`
                            }
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {row.related_type === "solicitud" ? "Solicitud" : "Propiedad"} #{row.related_id}
                          </Link>
                        ) : <span className="text-xs text-text-secondary">—</span>}
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-xs text-text-secondary">{row.sent_by_name ?? "—"}</td>
                      )}
                      <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{formatDate(row.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-text-secondary">{total} mensajes · pagina {page} de {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => load(page - 1)}
                    disabled={page <= 1 || isPending}
                    className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => load(page + 1)}
                    disabled={page >= totalPages || isPending}
                    className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
