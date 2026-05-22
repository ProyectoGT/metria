import { Lock, RotateCcw } from "lucide-react";
import Badge from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import type { BackupRun } from "../types/backup.types";
import { backupTypeLabel, formatBytes, formatDateTime } from "../utils/backupFormatters";

export default function RestoreWizard({ runs }: { runs: BackupRun[] }) {
  const verifiedRuns = runs.filter((run) => run.status === "verified");

  if (verifiedRuns.length === 0) {
    return (
      <EmptyState
        variant="compact"
        icon={<RotateCcw className="h-8 w-8" />}
        title="No hay copias verificadas para restaurar"
        description="Ninguna restauracion toca produccion sin una copia previa verificada."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-text-secondary">
        <div className="flex gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>
            La restauracion real queda protegida para fases posteriores: requiere reautenticacion/MFA,
            segunda aprobacion, backup previo automatico y dry-run. En esta fase solo se permite solicitar simulaciones.
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {verifiedRuns.map((run) => (
          <Card key={run.id} padding="md" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-text-secondary">{run.id}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{backupTypeLabel(run.backup_type)} verificada</p>
              </div>
              <Badge variant="warning">Solo simulación</Badge>
            </div>
            <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
              <span>Fecha: {formatDateTime(run.verified_at)}</span>
              <span>Tamano: {formatBytes(run.size_bytes)}</span>
              <span>Alcance: {Array.isArray(run.scope) ? run.scope.join(", ") : "-"}</span>
              <span>Destino: interno protegido</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
