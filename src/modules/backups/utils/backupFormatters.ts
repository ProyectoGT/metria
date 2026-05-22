import type { BackupRunStatus, BackupType } from "../types/backup.types";

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "-";
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function backupTypeLabel(type: BackupType): string {
  return type === "full" ? "Total" : "Incremental";
}

export function backupStatusLabel(status: BackupRunStatus): string {
  const labels: Record<BackupRunStatus, string> = {
    queued: "En cola",
    running: "Ejecutando",
    exporting_database: "Exportando BD",
    exporting_storage: "Exportando storage",
    compressing: "Comprimiendo",
    encrypting: "Cifrando",
    uploading: "Subiendo",
    verifying: "Verificando",
    verified: "Verificada",
    failed: "Fallida",
    expired: "Expirada",
    locked: "Bloqueada",
    cancelled: "Cancelada",
  };
  return labels[status];
}

export function backupStatusVariant(status: BackupRunStatus): "success" | "warning" | "danger" | "muted" | "primary" {
  if (status === "verified") return "success";
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "locked") return "primary";
  if (status === "expired") return "muted";
  return "warning";
}
