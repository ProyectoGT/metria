"use client";

import {
  CheckCircle2,
  Clock,
  Laptop,
  MapPin,
  Monitor,
  Pencil,
  Power,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { UserDevice } from "../types";

type Props = {
  device: UserDevice;
  busy: boolean;
  onEditAlias: (device: UserDevice) => void;
  onTrust: (deviceId: number) => void;
  onUntrust: (deviceId: number) => void;
  onRevoke: (device: UserDevice) => void;
};

function formatDateTime(iso: string | null) {
  if (!iso) return "No disponible";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function relativeTime(iso: string | null) {
  if (!iso) return "Sin actividad";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return formatDateTime(iso);
}

function deviceTypeLabel(type: string | null) {
  if (type === "mobile") return "Movil";
  if (type === "tablet") return "Tablet";
  if (type === "desktop") return "Ordenador";
  return "Otro";
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === "mobile") return <Smartphone className="h-5 w-5" />;
  if (type === "tablet") return <Tablet className="h-5 w-5" />;
  if (type === "desktop") return <Monitor className="h-5 w-5" />;
  return <Laptop className="h-5 w-5" />;
}

export default function DeviceCard({
  device,
  busy,
  onEditAlias,
  onTrust,
  onUntrust,
  onRevoke,
}: Props) {
  const title = device.alias || `${device.browser ?? "Navegador"} en ${device.os ?? "sistema desconocido"}`;
  const revoked = Boolean(device.revokedAt);
  const trusted = Boolean(device.trustedAt) && !revoked;
  const location = [device.lastCity, device.lastCountry].filter(Boolean).join(", ");

  return (
    <article
      className={`rounded-2xl border bg-surface p-5 shadow-sm transition-all ${
        revoked ? "border-border/70 opacity-75" : "border-border hover:border-primary/25 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              trusted ? "bg-success/10 text-success" : device.isCurrent ? "bg-primary/10 text-primary" : "bg-background text-text-secondary"
            }`}
          >
            <DeviceIcon type={device.deviceType} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-text-primary">
                {title}
              </h3>
              {device.isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  Este dispositivo
                </span>
              )}
              {trusted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  <ShieldCheck className="h-3 w-3" />
                  De confianza
                </span>
              )}
              {!trusted && !revoked && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                  No verificado
                </span>
              )}
              {revoked && (
                <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  Sesion cerrada
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-text-secondary">
              {device.browser ?? "Navegador desconocido"} - {device.os ?? "Sistema desconocido"} - {deviceTypeLabel(device.deviceType)}
            </p>

            <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Ultima actividad: {relativeTime(device.lastSeenAt)}
              </span>
              <span>Primera vez visto: {formatDateTime(device.firstSeenAt)}</span>
              <span>IP registrada: {device.lastIp ?? "No disponible"}</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {location || "Ubicacion no disponible"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onEditAlias(device)}
          disabled={busy || revoked}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          Alias
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        {trusted ? (
          <button
            type="button"
            onClick={() => onUntrust(device.id)}
            disabled={busy || revoked}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary disabled:opacity-50"
          >
            <ShieldOff className="h-4 w-4" />
            Quitar confianza
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onTrust(device.id)}
            disabled={busy || revoked}
            className="inline-flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm font-medium text-success transition-colors hover:bg-success/15 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            Marcar como de confianza
          </button>
        )}

        <button
          type="button"
          onClick={() => onRevoke(device)}
          disabled={busy || revoked}
          className="inline-flex items-center gap-2 rounded-lg border border-danger/20 px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
        >
          <Power className="h-4 w-4" />
          {device.isCurrent ? "Cerrar sesion actual" : "Cerrar sesion"}
        </button>
      </div>
    </article>
  );
}
