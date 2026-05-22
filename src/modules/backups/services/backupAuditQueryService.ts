import type { CurrentUserContext } from "@/lib/current-user";
import type { BackupAuditEvent } from "../types/backup.types";
import { assertCanReadBackups } from "./backupPermissions";
import { backupDb } from "./backupDb";

export async function listBackupAuditEvents(user: CurrentUserContext, limit = 50): Promise<BackupAuditEvent[]> {
  assertCanReadBackups(user);
  const { data, error } = await backupDb()
    .from("backup_audit_log")
    .select("*")
    .eq("empresa_id", user.empresaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`No se pudo cargar la auditoria de backups: ${error.message}`);
  return (data ?? []) as BackupAuditEvent[];
}
