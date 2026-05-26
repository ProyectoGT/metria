import { backupDb } from "./backupDb";
import { SENSITIVE_BACKUP_FIELDS, redactSensitiveFields } from "../config/sensitiveFields";

export type ChangeOperation =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "file_uploaded"
  | "file_deleted"
  | "permission_changed"
  | "setting_changed";

export type RecordBackupChangeInput = {
  empresaId: number | null;
  entityType: string;
  entityId: string;
  tableName: string;
  recordId: string;
  operation: ChangeOperation;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  changedBy?: number | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Registra un cambio en el log de backup. Nunca lanza — si falla, lo ignora
 * para no bloquear la operacion principal.
 */
export async function recordBackupChange(input: RecordBackupChangeInput): Promise<void> {
  try {
    const sensitiveFields = SENSITIVE_BACKUP_FIELDS as string[];
    await backupDb()
      .from("backup_change_log")
      .insert({
        empresa_id: input.empresaId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        table_name: input.tableName,
        record_id: input.recordId,
        operation: input.operation,
        old_data: input.oldData ? redactSensitiveFields(input.oldData, sensitiveFields) : null,
        new_data: input.newData ? redactSensitiveFields(input.newData, sensitiveFields) : null,
        changed_by: input.changedBy ?? null,
        changed_at: new Date().toISOString(),
        metadata: input.metadata ?? null,
      });
  } catch {
    // Fallo silencioso — nunca bloquear la operacion principal
  }
}

export type ChangeLogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  table_name: string | null;
  record_id: string | null;
  operation: ChangeOperation;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: number | null;
  changed_at: string;
  metadata: Record<string, unknown> | null;
};

export async function getUnprocessedChanges(
  empresaId: number | null,
  from: Date,
  to: Date,
): Promise<ChangeLogRow[]> {
  const { data } = await backupDb()
    .from("backup_change_log")
    .select("id, entity_type, entity_id, table_name, record_id, operation, old_data, new_data, changed_by, changed_at, metadata")
    .eq("empresa_id", empresaId)
    .gte("changed_at", from.toISOString())
    .lte("changed_at", to.toISOString())
    .is("processed_at", null)
    .order("changed_at", { ascending: true });

  return (data ?? []) as ChangeLogRow[];
}

export async function markChangesAsProcessed(
  changeIds: string[],
  backupRunId: string,
): Promise<void> {
  if (changeIds.length === 0) return;
  const now = new Date().toISOString();
  const batchSize = 100;

  for (let i = 0; i < changeIds.length; i += batchSize) {
    const batch = changeIds.slice(i, i + batchSize);
    await backupDb()
      .from("backup_change_log")
      .update({ processed_at: now, backup_run_id: backupRunId })
      .in("id", batch);
  }
}

export function groupChangesByEntity(
  changes: ChangeLogRow[],
): Record<string, { modified: number; deleted: number; ids: string[] }> {
  const groups: Record<string, { modified: number; deleted: number; ids: string[] }> = {};

  for (const change of changes) {
    const key = change.entity_type;
    if (!groups[key]) groups[key] = { modified: 0, deleted: 0, ids: [] };

    groups[key].ids.push(change.id);
    if (change.operation === "deleted" || change.operation === "file_deleted") {
      groups[key].deleted++;
    } else {
      groups[key].modified++;
    }
  }

  return groups;
}
