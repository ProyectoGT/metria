import type { CurrentUserContext } from "@/lib/current-user";
import { assertCanRequestRestore } from "./backupPermissions";
import { recordBackupAudit } from "./backupAuditService";
import { backupDb } from "./backupDb";

export async function requestRestoreSimulation(
  user: CurrentUserContext,
  backupRunId: string,
  restoreType: "full" | "database" | "storage" | "module" | "record" | "test_environment" | "production",
): Promise<string> {
  assertCanRequestRestore(user);

  const { data: backup } = await backupDb()
    .from("backup_runs")
    .select("id, status")
    .eq("id", backupRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  const backupRow = backup as { id: string; status: string } | null;
  if (!backupRow || backupRow.status !== "verified") {
    throw new Error("Solo se pueden solicitar restauraciones desde copias verificadas.");
  }

  const { data, error } = await backupDb()
    .from("restore_runs")
    .insert({
      empresa_id: user.empresaId,
      backup_run_id: backupRunId,
      status: restoreType === "production" ? "pending_approval" : "requested",
      restore_type: restoreType,
      target: { mode: "simulation_only" },
      requested_by: user.id,
      metadata: { phase: "restore_request_dry_run_only" },
    })
    .select("id")
    .single();

  if (error) throw new Error(`No se pudo solicitar la restauracion: ${error.message}`);

  await recordBackupAudit({
    eventType: "backup.restore.requested",
    user,
    backupRunId,
    restoreRunId: String((data as { id: string }).id),
    metadata: { restoreType, mode: "simulation_only" },
  });

  return String((data as { id: string }).id);
}
