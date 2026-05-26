import { recordAudit } from "@/lib/audit";
import type { CurrentUserContext } from "@/lib/current-user";
import { backupDb } from "./backupDb";

type BackupAuditInput = {
  eventType: string;
  user: CurrentUserContext;
  backupRunId?: string | null;
  profileId?: string | null;
  restoreRunId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordBackupAudit(input: BackupAuditInput): Promise<void> {
  const supabase = backupDb();

  await supabase.from("backup_audit_log").insert({
    empresa_id: input.user.empresaId,
    event_type: input.eventType,
    backup_run_id: input.backupRunId ?? null,
    profile_id: input.profileId ?? null,
    restore_run_id: input.restoreRunId ?? null,
    user_id: input.user.id,
    user_role: input.user.role,
    metadata: input.metadata ?? null,
  });

  await recordAudit({
    actorId: input.user.id,
    empresaId: input.user.empresaId,
    action: input.eventType,
    entityType: "backup",
    entityId: input.backupRunId ?? input.profileId ?? input.restoreRunId ?? undefined,
    metadata: input.metadata ?? undefined,
  });
}
