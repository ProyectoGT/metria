"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Star,
  Globe,
  User,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import type { PropiedadRow, ZonaOption, AgenteOption } from "./page";
import {
  WEB_SYNC_STATUS_LABEL,
  WEB_SYNC_STATUS_COLOR,
  type WebSyncStatus,
} from "@/lib/web-sync";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADOS: Record<string, string> = {
  neutral:       "Neutral",
  investigacion: "Investigacion",
  seguimiento:   "Seguimiento",
  noticia:       "Noticia",
  encargo:       "Encargo",
  vendido:       "Vendido",
};

const ESTADO_COLOR: Record<string, string> = {
  neutral:       "bg-surface-raised text-text-secondary",
  investigacion: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  seguimiento:   "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  noticia:       "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  encargo:       "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  vendido:       "bg-success/10 text-success",
};

const OPERACION_LABEL: Record<string, string> = {
  venta:         "Venta",
  alquiler:      "Alquiler",
  venta_alquiler:"Venta/Alquiler",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrecio(p: PropiedadRow): string {
  const v = p.precio ?? p.honorarios;
  if (!v) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function getDisplayTitle(p: PropiedadRow): string {
  if (p.titulo) return p.titulo;
  const parts = [];
  if (p.propietario) parts.push(p.propietario);
  if (p.planta) parts.push(`Pl. ${p.planta}`);
  if (p.puerta) parts.push(`Pt. ${p.puerta}`);
  return parts.length > 0 ? parts.join(" — ") : `Propiedad #${p.id}`;
}

function getUbicacion(p: PropiedadRow): string {
  const parts = [];
  if (p.zona_nombre)   parts.push(p.zona_nombre);
  if (p.sector_numero) parts.push(`Sector ${p.sector_numero}`);
  if (p.finca_numero)  parts.push(`Finca ${p.finca_numero}`);
  return parts.join(" › ") || "Sin ubicacion";
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-success" :
    score >= 50 ? "text-amber-600 dark:text-amber-400" :
    "text-danger";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <TrendingUp className="h-3 w-3" />
      {score}%
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  propiedades: PropiedadRow[];
  zonas: ZonaOption[];
  agentes: AgenteOption[];
  isManager: boolean;
  currentUserId: number;
  loadError?: string | null;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PropiedadesClient({ propiedades, zonas, agentes, isManager, loadError }: Props) {
  const [view, setView]           = useState<"table" | "cards">("table");
  const [search, setSearch]       = useState("");
  const [filterEstado, setEstado] = useState("");
  const [filterZona, setZona]     = useState("");
  const [filterAgente, setAgente] = useState("");
  const [filterOp, setOp]         = useState("");
  const [filterWeb, setWeb]       = useState("");
  const [filterFicha, setFicha]   = useState("");

  // ── Filtros client-side ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return propiedades.filter((p) => {
      if (q && ![getDisplayTitle(p), p.propietario, p.planta, p.puerta, p.zona_nombre, p.finca_numero]
        .some((v) => v?.toLowerCase().includes(q))) return false;
      if (filterEstado && p.estado !== filterEstado) return false;
      if (filterZona   && String(p.zona_id) !== filterZona) return false;
      if (filterAgente && String(p.agente_asignado) !== filterAgente) return false;
      if (filterOp     && p.tipo_operacion !== filterOp) return false;
      if (filterWeb === "si"  && !p.publicar_en_web) return false;
      if (filterWeb === "no"  && p.publicar_en_web)  return false;
      if (filterFicha === "completa"   && !p.ficha_completa) return false;
      if (filterFicha === "incompleta" && p.ficha_completa)  return false;
      return true;
    });
  }, [propiedades, search, filterEstado, filterZona, filterAgente, filterOp, filterWeb, filterFicha]);

  const resetFilters = () => {
    setSearch(""); setEstado(""); setZona(""); setAgente("");
    setOp(""); setWeb(""); setFicha("");
  };
  const hasFilters = search || filterEstado || filterZona || filterAgente || filterOp || filterWeb || filterFicha;

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          No se han podido cargar las propiedades: {loadError}
        </div>
      )}
      {/* ── Barra de filtros ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar propiedad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          <select value={filterEstado} onChange={(e) => setEstado(e.target.value)} className="input w-auto">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <select value={filterZona} onChange={(e) => setZona(e.target.value)} className="input w-auto">
            <option value="">Todas las zonas</option>
            {zonas.map((z) => <option key={z.id} value={String(z.id)}>{z.nombre}</option>)}
          </select>

          {isManager && (
            <select value={filterAgente} onChange={(e) => setAgente(e.target.value)} className="input w-auto">
              <option value="">Todos los agentes</option>
              {agentes.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
            </select>
          )}

          <select value={filterOp} onChange={(e) => setOp(e.target.value)} className="input w-auto">
            <option value="">Operacion</option>
            {Object.entries(OPERACION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <select value={filterWeb} onChange={(e) => setWeb(e.target.value)} className="input w-auto">
            <option value="">Publicacion web</option>
            <option value="si">En web</option>
            <option value="no">No en web</option>
          </select>

          <select value={filterFicha} onChange={(e) => setFicha(e.target.value)} className="input w-auto">
            <option value="">Ficha</option>
            <option value="completa">Completa</option>
            <option value="incompleta">Incompleta</option>
          </select>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-1">
            <button
              onClick={() => setView("table")}
              className={`rounded-md p-1.5 transition-colors ${view === "table" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
              title="Vista tabla"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("cards")}
              className={`rounded-md p-1.5 transition-colors ${view === "cards" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
              title="Vista cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="border-t border-border px-4 py-2">
            <button onClick={resetFilters} className="text-xs text-text-secondary hover:text-text-primary">
              Limpiar filtros · {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface">
          <Building2 className="mb-3 h-10 w-10 text-text-secondary/30" />
          <p className="text-sm font-medium text-text-secondary">
            {hasFilters ? "Sin resultados para los filtros aplicados" : "No hay propiedades registradas"}
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="mt-2 text-xs text-primary hover:underline">
              Quitar filtros
            </button>
          )}
        </div>
      )}

      {/* ── Vista tabla ─────────────────────────────────────────────────── */}
      {view === "table" && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-border bg-muted">
                <tr>
                  {["Propiedad", "Ubicacion", "Estado", "Operacion", "Precio", "Agente", "Ficha", "Web", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.web_destacada && <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                        <div>
                          <p className="font-medium text-text-primary">{getDisplayTitle(p)}</p>
                          {p.planta && <p className="text-xs text-text-secondary">Pl. {p.planta}{p.puerta ? ` · Pt. ${p.puerta}` : ""}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">{getUbicacion(p)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ESTADO_COLOR[p.estado ?? "neutral"] ?? ESTADO_COLOR.neutral}`}>
                          {ESTADOS[p.estado ?? "neutral"] ?? p.estado}
                        </span>
                        {p.has_sale_history && (
                          <span className="inline-flex rounded-full border border-emerald-500/25 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                            Historico venta
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {p.tipo_operacion ? OPERACION_LABEL[p.tipo_operacion] ?? p.tipo_operacion : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      {formatPrecio(p)}
                    </td>
                    <td className="px-4 py-3">
                      {p.agente_nombre ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                          <span className="text-xs text-text-secondary">{p.agente_nombre}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-secondary/50">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={p.calidad_ficha_score} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${WEB_SYNC_STATUS_COLOR[p.estado_publicacion_web as WebSyncStatus] ?? "bg-surface-raised text-text-secondary"}`}>
                        {WEB_SYNC_STATUS_LABEL[p.estado_publicacion_web as WebSyncStatus] ?? p.estado_publicacion_web}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/propiedades/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                      >
                        Ver
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-2.5">
            <p className="text-xs text-text-secondary">{filtered.length} propiedad{filtered.length !== 1 ? "es" : ""}</p>
          </div>
        </div>
      )}

      {/* ── Vista cards ─────────────────────────────────────────────────── */}
      {view === "cards" && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/propiedades/${p.id}`} className="group block">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:border-secondary/35 hover:shadow-md">
                {/* Header color strip */}
                <div className={`h-1.5 w-full ${p.ficha_completa ? "bg-success" : "bg-border"}`} />
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {p.web_destacada && <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                        <h3 className="truncate text-sm font-semibold text-text-primary">
                          {getDisplayTitle(p)}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{getUbicacion(p)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_COLOR[p.estado ?? "neutral"] ?? ESTADO_COLOR.neutral}`}>
                        {ESTADOS[p.estado ?? "neutral"] ?? p.estado}
                      </span>
                      {p.has_sale_history && (
                        <span className="rounded-full border border-emerald-500/25 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          Historico venta
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                    <div>
                      <p className="font-medium text-text-primary">{formatPrecio(p)}</p>
                      <p>{p.tipo_operacion ? OPERACION_LABEL[p.tipo_operacion] ?? p.tipo_operacion : "—"}</p>
                    </div>
                    <div className="text-right">
                      {p.agente_nombre && (
                        <>
                          <User className="inline h-3 w-3 mr-0.5" />
                          <span>{p.agente_nombre}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={p.calidad_ficha_score} />
                      {p.publicar_en_web && (
                        <span className="flex items-center gap-0.5 text-[11px] font-medium text-primary">
                          <Globe className="h-3 w-3" />
                          Web
                        </span>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${WEB_SYNC_STATUS_COLOR[p.estado_publicacion_web as WebSyncStatus] ?? "bg-surface-raised text-text-secondary"}`}>
                      {WEB_SYNC_STATUS_LABEL[p.estado_publicacion_web as WebSyncStatus] ?? "—"}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full transition-all ${p.calidad_ficha_score >= 80 ? "bg-success" : p.calidad_ficha_score >= 50 ? "bg-amber-500" : "bg-danger"}`}
                      style={{ width: `${p.calidad_ficha_score}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
