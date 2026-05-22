import type { BackupRun } from "../types/backup.types";
import { backupTypeLabel, formatDateTime } from "../utils/backupFormatters";

export default function BackupRunDetails({ run }: { run: BackupRun }) {
  return (
    <div className="space-y-2 text-sm">
      <p><span className="text-text-secondary">ID:</span> <span className="font-mono">{run.id}</span></p>
      <p><span className="text-text-secondary">Tipo:</span> {backupTypeLabel(run.backup_type)}</p>
      <p><span className="text-text-secondary">Verificada:</span> {formatDateTime(run.verified_at)}</p>
    </div>
  );
}
