import type { CurrentUserContext } from "@/lib/current-user";
import type {
  BackupRun,
  DryRunReport,
  DryRunValidation,
  EntityImpact,
  RestoreRun,
} from "../types/backup.types";
import { assertCanRequestRestore, assertCanReadBackups } from "./backupPermissions";
import { recordBackupAudit } from "./backupAuditService";
import { backupDb } from "./backupDb";
import { validateBackupChain } from "./backupChainService";
import { getEntitiesForScope } from "../config/backupEntities";
import { BACKUP_BUCKET } from "./backupStorageService";
import { createAdminClient } from "@/lib/supabase-admin";

// ── Internal helpers ────────────────────────────────────────────────────────

async function countCurrentRows(
  table: string,
  companyField: string | null | undefined,
  empresaId: number | null,
): Promise<number> {
  try {
    const db = backupDb();
    const query = db.from(table).select("*", { count: "exact", head: true } as Record<string, unknown>);
    const filtered = companyField && empresaId
      ? (query as unknown as { eq: (c: string, v: unknown) => typeof query }).eq(companyField, empresaId)
      : query;
    const { count } = await (filtered as unknown as Promise<{ count: number | null }>);
    return count ?? 0;
  } catch { return 0; }
}

async function countModifiedSince(
  table: string,
  companyField: string | null | undefined,
  empresaId: number | null,
  since: string,
): Promise<{ count: number; available: boolean }> {
  try {
    const db = backupDb();
    const query = db
      .from(table)
      .select("*", { count: "exact", head: true } as Record<string, unknown>)
      .gte("updated_at", since);
    const filtered = companyField && empresaId
      ? (query as unknown as { eq: (c: string, v: unknown) => typeof query }).eq(companyField, empresaId)
      : query;
    const { count, error } = await (filtered as unknown as Promise<{ count: number | null; error: unknown }>);
    if (error) return { count: 0, available: false };
    return { count: count ?? 0, available: true };
  } catch { return { count: 0, available: false }; }
}

async function checkStorageAccessible(empresaId: number | null, backupRunId: string): Promise<boolean> {
  try {
    const { data } = await createAdminClient().storage
      .from(BACKUP_BUCKET)
      .list(`${empresaId ?? "global"}/${backupRunId}`);
    return Boolean(data && data.length > 0);
  } catch { return false; }
}

// ── Prerequisite validation ────────────────────────────────────────────────

async function runValidations(run: BackupRun, empresaId: number | null): Promise<DryRunValidation[]> {
  const checks: DryRunValidation[] = [];

  checks.push({
    check: "backup_verified",
    status: run.status === "verified" ? "passed" : "failed",
    message: run.status === "verified" ? "Backup verificado." : `Backup no verificado (${run.status}).`,
  });

  checks.push({
    check: "manifest_exists",
    status: run.manifest ? "passed" : "failed",
    message: run.manifest ? "Manifiesto presente." : "Manifiesto ausente.",
  });

  checks.push({
    check: "checksum_present",
    status: run.checksum ? "passed" : "warning",
    message: run.checksum ? "Checksum del manifiesto registrado." : "Sin checksum registrado.",
  });

  checks.push({
    check: "empresa_match",
    status: run.empresa_id === empresaId ? "passed" : "failed",
    message: run.empresa_id === empresaId
      ? "Backup pertenece a esta empresa."
      : "El backup no pertenece a esta empresa.",
  });

  if (run.backup_type === "incremental" && run.parent_backup_id) {
    const chain = await validateBackupChain(run.parent_backup_id, empresaId);
    checks.push({
      check: "incremental_chain_valid",
      status: chain.valid ? "passed" : "failed",
      message: chain.valid
        ? `Cadena incremental valida (${chain.chain.length} eslabon/es).`
        : `Cadena rota: ${chain.error}`,
    });
  }

  const phase = run.manifest?.phase ?? "logical_manifest";
  checks.push({
    check: "data_exported",
    status: phase === "data_export" ? "passed" : "warning",
    message: phase === "data_export"
      ? "Backup con datos reales exportados."
      : "Backup de Fase 1 (manifiesto logico). Datos reales no disponibles.",
  });

  const storageOk = await checkStorageAccessible(empresaId, run.id);
  checks.push({
    check: "storage_accessible",
    status: storageOk ? "passed" : "warning",
    message: storageOk
      ? "Archivos accesibles en Storage privado."
      : "Archivos no encontrados en Storage (puede ser backup de Fase 1).",
  });

  return checks;
}

// ── Dry-run analysis ──────────────────────────────────────────────────────

export async function executeDryRunAnalysis(
  run: BackupRun,
  empresaId: number | null,
): Promise<DryRunReport> {
  const computedAt = new Date().toISOString();
  const validations = await runValidations(run, empresaId);
  const hasCriticalFailure = validations.some((v) => v.status === "failed");

  const chainResult = run.backup_type === "incremental" && run.parent_backup_id
    ? await validateBackupChain(run.parent_backup_id, empresaId)
    : { valid: true as const, chain: [] as BackupRun[] };

  const storageOk = validations.find((v) => v.check === "storage_accessible")?.status !== "failed";
  const schemaCompat = (run.manifest?.phase ?? "logical_manifest") === "data_export";
  const manifestEntities = run.manifest?.entities ?? {};
  const scope = (run.scope as string[] | undefined) ?? ["all"];
  const entityDefs = getEntitiesForScope(scope as Parameters<typeof getEntitiesForScope>[0]);

  const entities: Record<string, EntityImpact> = {};
  const warnings: string[] = [];
  const conflicts: string[] = [];
  let totalBackupRows = 0;
  let totalCurrentRows = 0;
  let totalConflicts = 0;

  if (!hasCriticalFailure) {
    const since = run.verified_at ?? run.created_at;
    for (const def of entityDefs) {
      const me = manifestEntities[def.key];
      const backupRows = me?.rows ?? 0;
      const currentRows = await countCurrentRows(def.table, def.companyField, empresaId);
      const { count: modified, available } = await countModifiedSince(def.table, def.companyField, empresaId, since);

      entities[def.key] = {
        entity_key: def.key,
        table: def.table,
        backup_rows: backupRows,
        current_rows: currentRows,
        modified_since_backup: modified,
        estimated_conflicts: modified,
        backup_status: (me?.status ?? "skipped") as EntityImpact["backup_status"],
        change_detection: available ? "available" : "unavailable",
      };

      totalBackupRows += backupRows;
      totalCurrentRows += currentRows;
      totalConflicts += modified;

      if (modified > 0) conflicts.push(`${def.label}: ${modified} registro(s) modificado(s) o creado(s) despues del backup.`);
      if (!available) warnings.push(`${def.label}: sin columna updated_at — conflictos no detectables.`);
    }
  }

  if (!schemaCompat) warnings.push("Backup de Fase 1 — sin datos reales exportados. Restore productivo no disponible.");
  if (run.backup_type === "incremental" && run.manifest?.coverage === "partial") {
    warnings.push("Cobertura incremental parcial — algunos modulos sin deteccion de cambios.");
  }
  if (!storageOk) warnings.push("Storage no accesible — restauracion de documentos y avatares no disponible.");

  const storageObjects = run.manifest?.storage?.objects ?? 0;

  const recommendation = hasCriticalFailure
    ? "No se puede continuar. Corrige los errores criticos primero."
    : totalConflicts > 0
      ? `Hay ${totalConflicts} registro(s) con posibles conflictos. Revisar antes de restaurar en produccion.`
      : "El backup parece apto para simulacion. La restauracion productiva requiere aprobacion adicional.";

  return {
    backup_id: run.manifest?.backup_id ?? run.id,
    backup_verified_at: run.verified_at,
    backup_type: run.backup_type,
    backup_phase: run.manifest?.phase ?? "logical_manifest",
    validations,
    chain_valid: chainResult.valid,
    chain_error: !chainResult.valid ? chainResult.error : undefined,
    schema_compatible: schemaCompat,
    storage_available: storageOk,
    entities,
    total_backup_rows: totalBackupRows,
    total_current_rows: totalCurrentRows,
    total_estimated_conflicts: totalConflicts,
    storage_objects_in_backup: storageObjects,
    restore_type: "simulation_only",
    production_safe: false,
    warnings,
    conflicts,
    recommendation,
    computed_at: computedAt,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function requestRestoreSimulation(
  user: CurrentUserContext,
  backupRunId: string,
): Promise<string> {
  assertCanRequestRestore(user);

  const { data: runData } = await backupDb()
    .from("backup_runs")
    .select("id, status, empresa_id")
    .eq("id", backupRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  const run = runData as { id: string; status: string; empresa_id: number | null } | null;
  if (!run || run.status !== "verified") {
    throw new Error("Solo se pueden solicitar restauraciones de backups verificados.");
  }

  const { data, error } = await backupDb()
    .from("restore_runs")
    .insert({
      empresa_id: user.empresaId,
      backup_run_id: backupRunId,
      status: "requested",
      restore_type: "test_environment",
      target: { mode: "simulation_only" },
      requested_by: user.id,
      metadata: { phase: "restore_request_dry_run_only" },
    })
    .select("id")
    .single();

  if (error) throw new Error(`No se pudo crear la solicitud: ${error.message}`);
  const id = (data as { id: string }).id;

  await recordBackupAudit({
    eventType: "restore.sandbox.requested",
    user,
    backupRunId,
    restoreRunId: id,
    metadata: { mode: "simulation_only" },
  });

  return id;
}

export async function startDryRun(
  user: CurrentUserContext,
  backupRunId: string,
): Promise<RestoreRun> {
  assertCanRequestRestore(user);

  const { data: runData } = await backupDb()
    .from("backup_runs")
    .select("*")
    .eq("id", backupRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  if (!runData) throw new Error("Backup no encontrado o sin permisos.");
  const run = runData as BackupRun;
  if (run.status !== "verified") throw new Error("Solo se pueden analizar backups verificados.");

  const now = new Date().toISOString();
  const { data: restoreData, error: insertErr } = await backupDb()
    .from("restore_runs")
    .insert({
      empresa_id: user.empresaId,
      backup_run_id: backupRunId,
      status: "dry_running",
      restore_type: "test_environment",
      target: { mode: "simulation_only" },
      requested_by: user.id,
      started_at: now,
      metadata: { phase: "dry_run_analysis" },
    })
    .select("*")
    .single();

  if (insertErr) throw new Error(`No se pudo iniciar el analisis: ${insertErr.message}`);
  const restoreRun = restoreData as RestoreRun;

  let report: DryRunReport;
  let finalStatus: RestoreRun["status"];
  let errorMsg: string | null = null;

  try {
    report = await executeDryRunAnalysis(run, user.empresaId);
    finalStatus = report.validations.some((v) => v.status === "failed") ? "failed" : "ready";
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    finalStatus = "failed";
    report = buildEmptyReport(run, errorMsg);
  }

  const { data: updated } = await backupDb()
    .from("restore_runs")
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      dry_run_result: report as unknown as Record<string, unknown>,
      error_message: errorMsg,
    })
    .eq("id", restoreRun.id)
    .select("*")
    .single();

  await recordBackupAudit({
    eventType: finalStatus === "ready" ? "restore.dry_run.completed" : "restore.dry_run.failed",
    user,
    backupRunId,
    restoreRunId: restoreRun.id,
    metadata: {
      conflicts: report.total_estimated_conflicts,
      chain_valid: report.chain_valid,
      schema_compatible: report.schema_compatible,
      warnings: report.warnings.length,
    },
  });

  return (updated ?? restoreRun) as RestoreRun;
}

export async function getRestoreRun(
  user: CurrentUserContext,
  restoreRunId: string,
): Promise<RestoreRun | null> {
  assertCanReadBackups(user);
  const { data } = await backupDb()
    .from("restore_runs")
    .select("*")
    .eq("id", restoreRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();
  return data as RestoreRun | null;
}

export async function listRestoreRuns(
  user: CurrentUserContext,
  backupRunId?: string,
): Promise<RestoreRun[]> {
  assertCanReadBackups(user);
  const base = backupDb()
    .from("restore_runs")
    .select("*")
    .eq("empresa_id", user.empresaId)
    .order("created_at", { ascending: false })
    .limit(20);

  const filtered = backupRunId
    ? (base as unknown as { eq: (c: string, v: unknown) => typeof base }).eq("backup_run_id", backupRunId)
    : base;

  const { data } = await (filtered as unknown as Promise<{ data: unknown }>);
  return (data ?? []) as RestoreRun[];
}

// ── Approval workflow ──────────────────────────────────────────────────────

export async function requestProductionRestore(
  user: CurrentUserContext,
  restoreRunId: string,
  selectedEntities: string[],
): Promise<void> {
  assertCanRequestRestore(user);

  const { data } = await backupDb()
    .from("restore_runs")
    .select("*")
    .eq("id", restoreRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  if (!data) throw new Error("Solicitud de restauracion no encontrada.");
  const rr = data as RestoreRun;
  if (rr.status !== "ready") throw new Error("Solo se puede solicitar restore productivo desde un analisis exitoso (estado: ready).");

  await backupDb()
    .from("restore_runs")
    .update({
      status: "pending_approval",
      restore_type: "production",
      target: { mode: "production", selected_entities: selectedEntities },
      metadata: { ...(rr.metadata ?? {}), production_requested_at: new Date().toISOString() },
    })
    .eq("id", restoreRunId);

  await recordBackupAudit({
    eventType: "restore.production.requested",
    user,
    backupRunId: rr.backup_run_id,
    restoreRunId,
    metadata: { selected_entities: selectedEntities },
  });
}

export async function approveProductionRestore(
  user: CurrentUserContext,
  restoreRunId: string,
): Promise<void> {
  assertCanManageBackupProfiles(user);

  const { data } = await backupDb()
    .from("restore_runs")
    .select("*")
    .eq("id", restoreRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  if (!data) throw new Error("Solicitud no encontrada.");
  const rr = data as RestoreRun;

  if (rr.status !== "pending_approval") throw new Error("Solo se puede aprobar una solicitud pendiente.");
  if (rr.requested_by === user.id) throw new Error("No puedes aprobar tu propia solicitud de restauracion.");

  await backupDb()
    .from("restore_runs")
    .update({ status: "approved", approved_by: user.id })
    .eq("id", restoreRunId);

  await recordBackupAudit({
    eventType: "restore.production.approved",
    user,
    backupRunId: rr.backup_run_id,
    restoreRunId,
    metadata: { approved_by: user.id },
  });
}

export async function rejectProductionRestore(
  user: CurrentUserContext,
  restoreRunId: string,
  reason: string,
): Promise<void> {
  assertCanManageBackupProfiles(user);

  const { data } = await backupDb()
    .from("restore_runs")
    .select("*")
    .eq("id", restoreRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  if (!data) throw new Error("Solicitud no encontrada.");
  const rr = data as RestoreRun;
  if (!["pending_approval", "approved"].includes(rr.status)) throw new Error("No se puede rechazar en este estado.");

  await backupDb()
    .from("restore_runs")
    .update({ status: "rejected", metadata: { ...(rr.metadata ?? {}), rejection_reason: reason } })
    .eq("id", restoreRunId);

  await recordBackupAudit({
    eventType: "restore.production.rejected",
    user,
    backupRunId: rr.backup_run_id,
    restoreRunId,
    metadata: { reason },
  });
}

export async function cancelRestore(user: CurrentUserContext, restoreRunId: string): Promise<void> {
  assertCanRequestRestore(user);

  const { data } = await backupDb()
    .from("restore_runs")
    .select("status, empresa_id, backup_run_id")
    .eq("id", restoreRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  if (!data) throw new Error("Solicitud no encontrada.");
  const rr = data as { status: string; empresa_id: number | null; backup_run_id: string };
  if (["restoring", "completed"].includes(rr.status)) throw new Error("No se puede cancelar en este estado.");

  await backupDb()
    .from("restore_runs")
    .update({ status: "cancelled" })
    .eq("id", restoreRunId);

  await recordBackupAudit({
    eventType: "restore.cancelled",
    user,
    backupRunId: rr.backup_run_id,
    restoreRunId,
    metadata: {},
  });
}

// ── Helpers needed by approval flow ───────────────────────────────────────

import { assertCanManageBackupProfiles } from "./backupPermissions";

function buildEmptyReport(run: BackupRun, errorMsg: string | null): DryRunReport {
  return {
    backup_id: run.id,
    backup_verified_at: run.verified_at,
    backup_type: run.backup_type,
    backup_phase: run.manifest?.phase ?? "logical_manifest",
    validations: [],
    chain_valid: false,
    schema_compatible: false,
    storage_available: false,
    entities: {},
    total_backup_rows: 0,
    total_current_rows: 0,
    total_estimated_conflicts: 0,
    storage_objects_in_backup: 0,
    restore_type: "simulation_only",
    production_safe: false,
    warnings: [],
    conflicts: [],
    recommendation: errorMsg ?? "Error desconocido durante el analisis.",
    computed_at: new Date().toISOString(),
  };
}
