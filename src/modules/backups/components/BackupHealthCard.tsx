import { Activity, AlertTriangle, CheckCircle2, Clock, DatabaseBackup } from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BackupHealth } from "../types/backup.types";
import { formatBytes, formatDateTime, formatDuration } from "../utils/backupFormatters";

const STATUS = {
  protected: { label: "Protegido", variant: "success" as const, icon: CheckCircle2 },
  attention: { label: "Atencion requerida", variant: "warning" as const, icon: AlertTriangle },
  critical: { label: "Critico", variant: "danger" as const, icon: AlertTriangle },
};

export default function BackupHealthCard({ health }: { health: BackupHealth }) {
  const status = STATUS[health.status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-3">
    <div className="grid gap-4 xl:grid-cols-[1.2fr_2fr]">
      <Card padding="lg" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Estado general</p>
            <p className="mt-1 text-sm text-text-secondary">Metria no solo hace copias: garantiza que se pueden restaurar.</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-surface-raised p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <StatusIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Riesgo actual</p>
            <p className="text-lg font-semibold text-text-primary">{health.status === "protected" ? "Bajo" : health.status === "attention" ? "Medio" : "Alto"}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<DatabaseBackup className="h-4 w-4" />} label="Ultima correcta" value={formatDateTime(health.lastSuccessfulRun?.verified_at)} />
        <Metric icon={<AlertTriangle className="h-4 w-4" />} label="Ultima fallida" value={formatDateTime(health.lastFailedRun?.created_at)} />
        <Metric icon={<Clock className="h-4 w-4" />} label="Proxima copia" value={health.nextScheduledRun ? formatDateTime(health.nextScheduledRun) : "Sin programar"} />
        <Metric icon={<Activity className="h-4 w-4" />} label="Copias disponibles" value={String(health.availableCopies)} />
        <Metric label="Tamano total" value={formatBytes(health.totalSizeBytes)} />
        <Metric label="Destino principal" value={health.primaryDestinationStatus === "healthy" ? "Correcto" : "Pendiente"} />
        <Metric label="Verificacion" value={health.verificationStatus === "passed" ? "Correcta" : "Pendiente"} />
        <Metric label="Tiempo medio" value={formatDuration(health.averageDurationMs)} />
        <Metric label="RPO estimado" value={health.rpo} />
        <Metric label="RTO estimado" value={health.rto} />
        <Metric label="Destino secundario" value={health.secondaryDestinationStatus === "healthy" ? "Correcto" : "Pendiente"} />
        <Metric label="Alertas abiertas" value={String(health.openAlerts.length)} />
      </div>
    </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card padding="sm" className="min-h-[92px]">
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-text-primary">{value}</p>
    </Card>
  );
}
