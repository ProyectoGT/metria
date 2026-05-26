import { AlertTriangle, CheckCircle2, XCircle, Database, HardDrive } from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BackupRun } from "../types/backup.types";
import { backupTypeLabel, formatBytes, formatDateTime, formatDuration } from "../utils/backupFormatters";

export default function BackupRunDetails({ run }: { run: BackupRun }) {
  const manifest = run.manifest;
  const entities = manifest?.entities ?? {};
  const entityList = Object.entries(entities);
  const exportedList = entityList.filter(([, e]) => e.status === "exported");
  const failedList = entityList.filter(([, e]) => e.status === "failed");
  const totalRows = exportedList.reduce((sum, [, e]) => sum + e.rows, 0);

  const phase = manifest?.phase ?? "logical_manifest";
  const dbExport = manifest?.database_export ?? "pending";

  return (
    <div className="space-y-5">
      {/* Resumen general */}
      <Card padding="md" className="grid gap-2 text-sm sm:grid-cols-2">
        <Row label="ID" value={<span className="font-mono text-xs">{run.id}</span>} />
        <Row label="Tipo" value={backupTypeLabel(run.backup_type)} />
        <Row label="Iniciado" value={formatDateTime(run.started_at)} />
        <Row label="Finalizado" value={formatDateTime(run.finished_at)} />
        <Row label="Duracion" value={formatDuration(run.duration_ms)} />
        <Row label="Tamaño total" value={formatBytes(run.size_bytes)} />
        {run.checksum && (
          <div className="col-span-full">
            <span className="text-text-secondary">Checksum: </span>
            <span className="break-all font-mono text-xs">{run.checksum}</span>
          </div>
        )}
      </Card>

      {/* Estado de exportacion */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusTile
          label="Base de datos"
          value={DB_EXPORT_LABELS[dbExport] ?? dbExport}
          variant={DB_EXPORT_VARIANT[dbExport] ?? "muted"}
        />
        <StatusTile
          label="Storage"
          value="Pendiente (Fase 4)"
          variant="muted"
        />
        <StatusTile
          label="Restauracion"
          value="Solo simulacion"
          variant="muted"
        />
      </div>

      {/* Advertencias y errores */}
      {manifest?.warnings && manifest.warnings.length > 0 && (
        <div className="space-y-1.5">
          {manifest.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}
      {manifest?.errors && manifest.errors.length > 0 && (
        <div className="space-y-1.5">
          {manifest.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Detalle de entidades exportadas */}
      {phase === "data_export" && entityList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">
              Entidades exportadas — {exportedList.length}/{entityList.length} ({totalRows.toLocaleString("es-ES")} filas)
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-background">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Entidad</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Filas</th>
                  <th className="px-3 py-2 text-right font-medium text-text-secondary">Tamaño</th>
                  <th className="px-3 py-2 text-center font-medium text-text-secondary">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entityList.map(([key, entity]) => (
                  <tr key={key} className="hover:bg-background/60">
                    <td className="px-3 py-2">
                      <span className="font-medium text-text-primary">{key}</span>
                      <span className="ml-1.5 text-text-secondary">({entity.table})</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {entity.status === "exported" ? entity.rows.toLocaleString("es-ES") : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {entity.status === "exported" ? formatBytes(entity.size_bytes) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {entity.status === "exported" ? (
                        <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-success" />
                      ) : entity.status === "failed" ? (
                        <span title={entity.error ?? ""}>
                          <XCircle className="mx-auto h-3.5 w-3.5 text-danger" />
                        </span>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {failedList.length > 0 && (
            <p className="text-xs text-danger">
              {failedList.length} entidad{failedList.length !== 1 ? "es" : ""} con error.
              {failedList.some(([, e]) => e.priority === "critical") && " Incluye entidades criticas — el backup no es confiable."}
            </p>
          )}
        </div>
      )}

      {/* Detalle de Storage */}
      {manifest?.storage?.bucket_details && Object.keys(manifest.storage.bucket_details).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-text-secondary" />
            <p className="text-sm font-semibold text-text-primary">
              Storage — {manifest.storage.objects} objetos copiados
              {manifest.storage.total_size > 0 && ` · ${formatBytesLocal(manifest.storage.total_size)}`}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.values(manifest.storage.bucket_details).map((br) => (
              <div key={br.bucket} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">{br.label}</span>
                  <Badge variant={STORAGE_STATUS_VARIANT[br.status] ?? "muted"}>
                    {STORAGE_STATUS_LABELS[br.status] ?? br.status}
                  </Badge>
                </div>
                <p className="mt-1 text-text-secondary">
                  {br.copied_objects}/{br.total_objects} objetos · {formatBytesLocal(br.total_size_bytes)}
                </p>
                {br.failed_objects > 0 && (
                  <p className="mt-0.5 text-danger">{br.failed_objects} objeto(s) fallaron.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "logical_manifest" && (
        <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-text-secondary">
          Copia generada sin exportacion de datos (backup antiguo).
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-text-secondary">{label}: </span>
      <span className="font-medium text-text-primary">{value}</span>
    </p>
  );
}

function StatusTile({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "success" | "warning" | "danger" | "muted" | "primary";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <Badge variant={variant} className="mt-1">{value}</Badge>
    </div>
  );
}

const DB_EXPORT_LABELS: Record<string, string> = {
  complete: "Completo",
  partial: "Parcial",
  failed: "Fallido",
  pending: "Pendiente",
};

const DB_EXPORT_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  complete: "success",
  partial: "warning",
  failed: "danger",
  pending: "muted",
};

const STORAGE_STATUS_LABELS: Record<string, string> = {
  complete: "Completo",
  partial: "Parcial",
  failed: "Fallido",
  empty: "Vacio",
};

const STORAGE_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  complete: "success",
  partial: "warning",
  failed: "danger",
  empty: "muted",
};

function formatBytesLocal(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
