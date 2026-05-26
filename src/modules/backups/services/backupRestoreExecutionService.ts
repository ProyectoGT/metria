import zlib from "node:zlib";
import type { CurrentUserContext } from "@/lib/current-user";
import type { BackupRun } from "../types/backup.types";
import { backupDb } from "./backupDb";
import { BACKUP_BUCKET } from "./backupStorageService";
import { createAdminClient } from "@/lib/supabase-admin";
import { getEntitiesForScope } from "../config/backupEntities";
import { executeBackupRun } from "./backupRunsService";

// ── Maintenance mode ───────────────────────────────────────────────────────

export async function activateMaintenanceMode(
  empresaId: number | null,
  restoreRunId: string,
  reason = "restore_in_progress",
): Promise<void> {
  await backupDb().from("system_maintenance").insert({
    empresa_id: empresaId,
    status: "active",
    reason,
    metadata: { restore_run_id: restoreRunId, started_at: new Date().toISOString() },
  });
  await backupDb().from("backup_audit_log").insert({
    empresa_id: empresaId,
    event_type: "maintenance.started",
    metadata: { reason, restore_run_id: restoreRunId },
  });
}

export async function deactivateMaintenanceMode(
  empresaId: number | null,
  restoreRunId: string,
): Promise<void> {
  await backupDb()
    .from("system_maintenance")
    .update({ status: "completed", metadata: { restore_run_id: restoreRunId, finished_at: new Date().toISOString() } })
    .eq("empresa_id", empresaId)
    .eq("status", "active");
  await backupDb().from("backup_audit_log").insert({
    empresa_id: empresaId,
    event_type: "maintenance.finished",
    metadata: { restore_run_id: restoreRunId },
  });
}

export async function isMaintenanceModeActive(empresaId: number | null): Promise<boolean> {
  const { data } = await backupDb()
    .from("system_maintenance")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

// ── Pre-restore backup ─────────────────────────────────────────────────────

export async function createPreRestoreBackup(
  user: CurrentUserContext,
  restoreRunId: string,
): Promise<BackupRun> {
  // Create an immediate full backup as rollback point
  const { data: runData, error } = await backupDb()
    .from("backup_runs")
    .insert({
      empresa_id: user.empresaId,
      backup_type: "full",
      status: "queued",
      triggered_mode: "system",
      triggered_by: user.id,
      scope: ["all"],
      destination_primary: { type: "supabase_storage" },
      metadata: { pre_restore_backup: true, restore_run_id: restoreRunId },
    })
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo crear el backup previo: ${error.message}`);
  const run = runData as BackupRun;

  // Execute synchronously (not via queue) so we know it's done
  await executeBackupRun({ backupRunId: run.id, empresaId: user.empresaId, requestedBy: user.id });

  // Re-fetch to get final state
  const { data: updated } = await backupDb()
    .from("backup_runs")
    .select("*")
    .eq("id", run.id)
    .single();

  const finalRun = updated as BackupRun;
  if (finalRun.status !== "verified") {
    throw new Error("El backup previo a la restauracion no pudo verificarse. Restauracion cancelada.");
  }

  await backupDb().from("backup_audit_log").insert({
    empresa_id: user.empresaId,
    event_type: "restore.pre_backup.completed",
    backup_run_id: run.id,
    metadata: { restore_run_id: restoreRunId },
  });

  return finalRun;
}

// ── Entity restore ─────────────────────────────────────────────────────────

type EntityRestoreResult = {
  entity_key: string;
  restored: number;
  skipped: number;
  errors: number;
  status: "completed" | "skipped" | "failed";
  error?: string;
};

async function restoreEntityFromBackup(
  entityKey: string,
  tableName: string,
  companyField: string | null | undefined,
  empresaId: number | null,
  backupRunId: string,
): Promise<EntityRestoreResult> {
  const filePath = `${empresaId ?? "global"}/${backupRunId}/data/${entityKey}.jsonl.gz`;

  try {
    const { data: blob, error: dlError } = await createAdminClient()
      .storage.from(BACKUP_BUCKET)
      .download(filePath);

    if (dlError || !blob) {
      return { entity_key: entityKey, restored: 0, skipped: 0, errors: 0, status: "skipped", error: "Archivo no encontrado en Storage." };
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const decompressed = zlib.gunzipSync(buffer).toString("utf-8");
    const lines = decompressed.split("\n").filter(Boolean);

    let restored = 0;
    let skipped = 0;
    let errors = 0;

    const BATCH = 50;
    for (let i = 0; i < lines.length; i += BATCH) {
      const batch = lines.slice(i, i + BATCH);
      const rows: Record<string, unknown>[] = [];

      for (const line of batch) {
        try {
          const row = JSON.parse(line) as Record<string, unknown>;

          // Skip tombstones (deleted records)
          if (row._op === "deleted") { skipped++; continue; }

          // Strip export metadata fields
          const { _op, _entity, ...data } = row;
          void _op; void _entity;

          // Enforce empresa_id — never restore data from another company
          if (companyField && empresaId && data[companyField] !== undefined) {
            if (data[companyField] !== empresaId) { skipped++; continue; }
          }

          // Skip redacted fields placeholder rows
          if (Object.values(data).includes("[REDACTADO]")) { skipped++; continue; }

          rows.push(data);
        } catch { errors++; }
      }

      if (rows.length > 0) {
        const db = backupDb();
        const { error: upsertError } = await (db.from(tableName) as unknown as {
          upsert: (rows: unknown[], opts: Record<string, unknown>) => Promise<{ error: unknown }>;
        }).upsert(rows, { onConflict: "id", ignoreDuplicates: false });

        if (upsertError) {
          errors += rows.length;
        } else {
          restored += rows.length;
        }
      }
    }

    return {
      entity_key: entityKey,
      restored,
      skipped,
      errors,
      status: errors > 0 && restored === 0 ? "failed" : "completed",
    };
  } catch (err) {
    return {
      entity_key: entityKey,
      restored: 0,
      skipped: 0,
      errors: 1,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Post-restore verification ──────────────────────────────────────────────

export type PostRestoreVerification = {
  passed: boolean;
  checks: Array<{ entity: string; backup_rows: number; current_rows: number; ok: boolean }>;
  warnings: string[];
};

async function verifyPostRestore(
  run: BackupRun,
  empresaId: number | null,
  selectedEntities: string[],
): Promise<PostRestoreVerification> {
  const manifestEntities = run.manifest?.entities ?? {};
  const scope = (run.scope as string[] | undefined) ?? ["all"];
  const entityDefs = getEntitiesForScope(scope as Parameters<typeof getEntitiesForScope>[0])
    .filter((e) => selectedEntities.length === 0 || selectedEntities.includes(e.key));

  const checks = [];
  const warnings: string[] = [];

  for (const def of entityDefs.slice(0, 10)) {
    const me = manifestEntities[def.key];
    const backupRows = me?.rows ?? 0;
    if (backupRows === 0) continue;

    let currentRows = 0;
    try {
      const query = backupDb().from(def.table).select("*", { count: "exact", head: true } as Record<string, unknown>);
      const filtered = def.companyField && empresaId
        ? (query as unknown as { eq: (c: string, v: unknown) => typeof query }).eq(def.companyField, empresaId)
        : query;
      const { count } = await (filtered as unknown as Promise<{ count: number | null }>);
      currentRows = count ?? 0;
    } catch { warnings.push(`${def.label}: no se pudo verificar.`); continue; }

    const ok = currentRows >= backupRows;
    checks.push({ entity: def.key, backup_rows: backupRows, current_rows: currentRows, ok });
    if (!ok) warnings.push(`${def.label}: se esperaban ${backupRows} filas, hay ${currentRows}.`);
  }

  return {
    passed: checks.every((c) => c.ok),
    checks,
    warnings,
  };
}

// ── Main restore execution ─────────────────────────────────────────────────

export type RestoreExecutionResult = {
  success: boolean;
  pre_restore_backup_id: string | null;
  entities: EntityRestoreResult[];
  verification: PostRestoreVerification | null;
  errors: string[];
  completed_at: string;
};

export async function executeProductionRestore(
  user: CurrentUserContext,
  restoreRunId: string,
  backupRunId: string,
  selectedEntities: string[],
): Promise<RestoreExecutionResult> {
  const result: RestoreExecutionResult = {
    success: false,
    pre_restore_backup_id: null,
    entities: [],
    verification: null,
    errors: [],
    completed_at: new Date().toISOString(),
  };

  let maintenanceActive = false;

  try {
    // 1. Create pre-restore backup
    await backupDb().from("backup_audit_log").insert({
      empresa_id: user.empresaId,
      event_type: "restore.pre_backup.started",
      metadata: { restore_run_id: restoreRunId },
    });

    const preBackup = await createPreRestoreBackup(user, restoreRunId);
    result.pre_restore_backup_id = preBackup.id;

    // Update restore_run with pre-backup id
    await backupDb()
      .from("restore_runs")
      .update({ pre_restore_backup_id: preBackup.id, status: "restoring" })
      .eq("id", restoreRunId);

    // 2. Get source backup
    const { data: runData } = await backupDb()
      .from("backup_runs")
      .select("*")
      .eq("id", backupRunId)
      .eq("empresa_id", user.empresaId)
      .maybeSingle();

    if (!runData) throw new Error("Backup de origen no encontrado.");
    const sourceRun = runData as BackupRun;

    // 3. Activate maintenance mode
    await activateMaintenanceMode(user.empresaId, restoreRunId);
    maintenanceActive = true;

    await backupDb().from("backup_audit_log").insert({
      empresa_id: user.empresaId,
      event_type: "restore.production.started",
      backup_run_id: backupRunId,
      metadata: { restore_run_id: restoreRunId, selected_entities: selectedEntities },
    });

    // 4. Restore entities
    const scope = (sourceRun.scope as string[] | undefined) ?? ["all"];
    const entityDefs = getEntitiesForScope(scope as Parameters<typeof getEntitiesForScope>[0])
      .filter((e) => selectedEntities.length === 0 || selectedEntities.includes(e.key));

    for (const def of entityDefs) {
      const entityResult = await restoreEntityFromBackup(
        def.key, def.table, def.companyField, user.empresaId, backupRunId,
      );
      result.entities.push(entityResult);
      if (entityResult.status === "failed" && def.priority === "critical") {
        result.errors.push(`[CRITICO] ${def.label}: ${entityResult.error}`);
      }
    }

    // 5. Post-restore verification
    result.verification = await verifyPostRestore(sourceRun, user.empresaId, selectedEntities);

    result.success = result.errors.length === 0;
    result.completed_at = new Date().toISOString();

    // 6. Update restore_run
    await backupDb()
      .from("restore_runs")
      .update({
        status: result.success ? "completed" : "failed",
        finished_at: result.completed_at,
        error_message: result.errors.length > 0 ? result.errors[0] : null,
        metadata: { execution_result: result as unknown as Record<string, unknown> },
      })
      .eq("id", restoreRunId);

    await backupDb().from("backup_audit_log").insert({
      empresa_id: user.empresaId,
      event_type: result.success ? "restore.production.completed" : "restore.production.failed",
      backup_run_id: backupRunId,
      metadata: {
        restore_run_id: restoreRunId,
        entities_restored: result.entities.filter((e) => e.status === "completed").length,
        errors: result.errors,
        verification_passed: result.verification?.passed,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    result.success = false;
    result.completed_at = new Date().toISOString();

    try {
      await Promise.resolve(backupDb()
        .from("restore_runs")
        .update({ status: "failed", finished_at: result.completed_at, error_message: msg })
        .eq("id", restoreRunId));
    } catch { /* best effort */ }

    try {
      await Promise.resolve(backupDb().from("backup_audit_log").insert({
        empresa_id: user.empresaId,
        event_type: "restore.production.failed",
        metadata: { restore_run_id: restoreRunId, error: msg },
      }));
    } catch { /* best effort */ }
  } finally {
    if (maintenanceActive) {
      try { await deactivateMaintenanceMode(user.empresaId, restoreRunId); } catch { /* best effort */ }
    }
  }

  return result;
}
