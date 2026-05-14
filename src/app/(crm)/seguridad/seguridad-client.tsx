"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  X,
  ChevronRight,
  LogIn,
  Globe2,
  Info,
} from "lucide-react";
import Avatar from "@/components/ui/avatar";
import type { LoginAuditRow } from "./page";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTimeShort(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  return `Hace ${d}d`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function isThisWeek(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeviceIcon({ type }: { type: string | null }) {
  if (type === "mobile") return <Smartphone className="h-4 w-4" />;
  if (type === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function DeviceBadge({ type }: { type: string | null }) {
  if (type === "mobile") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
        <Smartphone className="h-3 w-3" /> Movil
      </span>
    );
  }
  if (type === "tablet") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400">
        <Tablet className="h-3 w-3" /> Tablet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
      <Monitor className="h-3 w-3" /> Desktop
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
        <CheckCircle2 className="h-3 w-3" /> Correcto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
      <XCircle className="h-3 w-3" /> Fallido
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    Administrador: "bg-primary/10 text-primary",
    Director: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Responsable: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Agente: "bg-muted text-text-secondary",
  };
  const cls = map[role] ?? "bg-muted text-text-secondary";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {role}
    </span>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <span className={`rounded-xl p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-text-primary">{value}</p>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ row, onClose }: { row: LoginAuditRow; onClose: () => void }) {
  const location = [row.city, row.region, row.country].filter(Boolean).join(", ") || "Desconocida";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Detalle del acceso</h2>
              <p className="text-xs text-text-secondary">{formatDateTime(row.login_at)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {/* Usuario */}
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <Avatar name={row.user_name} size="md" />
            <div>
              <p className="font-medium text-text-primary">{row.user_name}</p>
              <p className="text-xs text-text-secondary">{row.user_email}</p>
            </div>
            <div className="ml-auto">
              <RoleBadge role={row.user_role} />
            </div>
          </div>

          <dl className="space-y-3">
            <DetailRow label="Estado">
              <StatusBadge status={row.status} />
              {row.failure_reason && (
                <span className="ml-2 text-xs text-text-secondary">{row.failure_reason}</span>
              )}
            </DetailRow>

            <DetailRow label="Dispositivo nuevo">
              {row.is_new_device ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                  <AlertTriangle className="h-3 w-3" /> Nuevo dispositivo
                </span>
              ) : (
                <span className="text-sm text-text-secondary">No (conocido)</span>
              )}
            </DetailRow>

            <hr className="border-border" />

            <DetailRow label="Dispositivo">
              <DeviceBadge type={row.device_type} />
            </DetailRow>
            <DetailRow label="Sistema operativo">
              <span className="text-sm text-text-primary">{row.os ?? "Desconocido"}</span>
            </DetailRow>
            <DetailRow label="Navegador">
              <span className="text-sm text-text-primary">{row.browser ?? "Desconocido"}</span>
            </DetailRow>

            <hr className="border-border" />

            <DetailRow label="Ubicacion">
              <span className="flex items-center gap-1.5 text-sm text-text-primary">
                <MapPin className="h-3.5 w-3.5 text-text-secondary" />
                {location}
              </span>
            </DetailRow>
            <DetailRow label="IP">
              <span className="font-mono text-sm text-text-primary">{row.ip_address ?? "No disponible"}</span>
            </DetailRow>

            <hr className="border-border" />

            <DetailRow label="Fecha / hora">
              <span className="text-sm text-text-primary">{formatDateTime(row.login_at)}</span>
            </DetailRow>
            <DetailRow label="Hace">
              <span className="text-sm text-text-secondary">{timeAgo(row.login_at)}</span>
            </DetailRow>

            {row.user_agent && (
              <>
                <hr className="border-border" />
                <div>
                  <dt className="mb-1 text-xs font-medium uppercase tracking-wider text-text-secondary/60">
                    User agent
                  </dt>
                  <dd className="break-all rounded-lg bg-muted px-3 py-2 font-mono text-[11px] text-text-secondary">
                    {row.user_agent}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-xs font-medium text-text-secondary/70">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  logs: LoginAuditRow[];
}

export default function SeguridadClient({ logs }: Props) {
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"" | "mobile" | "tablet" | "desktop">("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<LoginAuditRow | null>(null);

  // Summary stats
  const statsHoy = useMemo(() => logs.filter((l) => isToday(l.login_at)).length, [logs]);
  const statsNewDevices = useMemo(() => logs.filter((l) => l.is_new_device && isThisWeek(l.login_at)).length, [logs]);
  const statsMobile = useMemo(() => logs.filter((l) => l.device_type === "mobile" && isToday(l.login_at)).length, [logs]);
  const statsWeek = useMemo(() => logs.filter((l) => isThisWeek(l.login_at)).length, [logs]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = logs;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.user_name.toLowerCase().includes(q) ||
          l.user_email.toLowerCase().includes(q)
      );
    }

    if (deviceFilter) {
      list = list.filter((l) => l.device_type === deviceFilter);
    }

    if (onlyNew) {
      list = list.filter((l) => l.is_new_device);
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((l) => new Date(l.login_at).getTime() >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86399999; // end of day
      list = list.filter((l) => new Date(l.login_at).getTime() <= to);
    }

    return list;
  }, [logs, search, deviceFilter, onlyNew, dateFrom, dateTo]);

  const hasFilters = search || deviceFilter || onlyNew || dateFrom || dateTo;

  function clearFilters() {
    setSearch("");
    setDeviceFilter("");
    setOnlyNew(false);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Accesos hoy"
          value={statsHoy}
          icon={LogIn}
          accent="bg-primary/10 text-primary"
        />
        <SummaryCard
          label="Nuevos dispositivos (7d)"
          value={statsNewDevices}
          icon={AlertTriangle}
          accent="bg-warning/10 text-warning"
        />
        <SummaryCard
          label="Desde movil (hoy)"
          value={statsMobile}
          icon={Smartphone}
          accent="bg-blue-500/10 text-blue-500"
        />
        <SummaryCard
          label="Esta semana"
          value={statsWeek}
          icon={Shield}
          accent="bg-success/10 text-success"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="text"
              className="input w-full pl-9 pr-3 py-2 text-sm"
              placeholder="Buscar usuario o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Date from */}
          <input
            type="date"
            className="input py-2 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Desde"
          />

          {/* Date to */}
          <input
            type="date"
            className="input py-2 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Hasta"
          />

          {/* Device */}
          <select
            className="input py-2 text-sm"
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value as "" | "mobile" | "tablet" | "desktop")}
          >
            <option value="">Todos los dispositivos</option>
            <option value="mobile">Movil</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>

          {/* New device toggle */}
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <div
              onClick={() => setOnlyNew((p) => !p)}
              className={[
                "relative h-5 w-9 rounded-full transition-colors",
                onlyNew ? "bg-primary" : "bg-border",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  onlyNew ? "translate-x-4" : "translate-x-0.5",
                ].join(" ")}
              />
            </div>
            <span className="text-sm text-text-secondary">Solo nuevos</span>
          </label>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        {/* Table header info */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">
              Registros de acceso
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
            {filtered.length !== logs.length && ` (de ${logs.length} total)`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Shield className="h-8 w-8 text-text-secondary/40" />
            </div>
            <p className="text-sm font-medium text-text-secondary">
              {logs.length === 0
                ? "Todavia no hay registros de acceso"
                : "Sin resultados para los filtros aplicados"}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary transition-colors hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs font-semibold uppercase tracking-wide text-text-secondary/60">
                  <th className="px-5 py-3 text-left">Usuario</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Rol</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="hidden px-4 py-3 text-left lg:table-cell">Dispositivo</th>
                  <th className="hidden px-4 py-3 text-left xl:table-cell">Ubicacion</th>
                  <th className="hidden px-4 py-3 text-left xl:table-cell">IP</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">Nuevo</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer transition-colors hover:bg-background"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.user_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">{row.user_name}</p>
                          <p className="truncate text-xs text-text-secondary">{row.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <RoleBadge role={row.user_role} />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="whitespace-nowrap text-text-primary">{formatDateTimeShort(row.login_at)}</p>
                        <p className="text-xs text-text-secondary">{timeAgo(row.login_at)}</p>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <DeviceIcon type={row.device_type} />
                          <span className="capitalize">{row.os ?? "—"}</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-text-secondary/70">
                          <Globe2 className="h-3 w-3" />
                          {row.browser ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 xl:table-cell">
                      <span className="flex items-center gap-1 text-text-secondary">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 xl:table-cell">
                      <span className="font-mono text-xs text-text-secondary">
                        {row.ip_address ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {row.is_new_device ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                          <AlertTriangle className="h-3 w-3" /> Nuevo
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary/50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-text-secondary/40">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {logs.length >= 500 && (
          <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-text-secondary">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Mostrando los ultimos 500 registros. Usa los filtros de fecha para consultar periodos anteriores.
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal row={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
