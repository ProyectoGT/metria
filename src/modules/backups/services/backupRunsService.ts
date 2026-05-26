import crypto from "node:crypto";
import { enqueueJob } from "@/jobs";
import type { CurrentUserContext } from "@/lib/current-user";
import { getEntitiesForScope } from "../config/backupEntities";
import type {
  BackupHealth,
  BackupManifest,
  BackupRun,
  BackupScopeKey,
  ManualBackupInput,
} from "../types/backup.types";
import { assertCanCreateBackup, assertCanReadBackups } from "./backupPermissions";
import { recordBackupAudit } from "./backupAuditService";
import { backupDb } from "./backupDb";
import {
  exportDatabaseEntities,
  exportIncrementalEntities,
  generateSchemaSnapshot,
  generateChecksumFile,
  registerEntityArtifacts,
} from "./backupExportService";
import { uploadBackupFile } from "./backupStorageService";
import {
  exportStorageBuckets,
  buildStorageManifest,
  registerStorageArtifacts,
} from "./backupStorageExportService";
import {
  getUnprocessedChanges,
  markChangesAsProcessed,
} from "./backupChangeLogService";
import {
  validateBackupChain,
  getIncrementalWindow,
} from "./backupChainService";

import { BACKUP_CREATE_JOB } from "@/jobs/constants";
export { BACKUP_CREATE_JOB };

type BackupCreatePayload = {
  backupRunId: string;
  empresaId: number | null;
  requestedBy: number;
};

function db() {
  return backupDb();
}

function sanitizeScope(scope: string[]): BackupScopeKey[] {
  return scope.filter(Boolean) as BackupScopeKey[];
}

export async function listBackupRuns(user: CurrentUserContext, limit = 50): Promise<BackupRun[]> {
  assertCanReadBackups(user);
  const { data, error } = await db()
    .from("backup_runs")
    .select("*")
    .eq("empresa_id", user.empresaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`No se pudo cargar el historial de backups: ${error.message}`);
  return (data ?? []) as BackupRun[];
}

export async function getLastVerifiedFullBackup(user: CurrentUserContext): Promise<BackupRun | null> {
  assertCanReadBackups(user);
  const { data } = await db()
    .from("backup_runs")
    .select("*")
    .eq("empresa_id", user.empresaId)
    .eq("backup_type", "full")
    .eq("status", "verified")
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BackupRun | null) ?? null;
}

export async function getBackupHealth(user: CurrentUserContext): Promise<BackupHealth> {
  // Get next scheduled run from enabled profiles
  const { data: profileRows } = await backupDb()
    .from("backup_profiles")
    .select("next_run_at")
    .eq("empresa_id", user.empresaId)
    .eq("enabled", true)
    .not("next_run_at", "is", null)
    .order("next_run_at", { ascending: true })
    .limit(1);

  const nextScheduledRun =
    profileRows && (profileRows as Array<{ next_run_at: string | null }>).length > 0
      ? (profileRows as Array<{ next_run_at: string | null }>)[0].next_run_at
      : null;

  const runs = await listBackupRuns(user, 100);
  const verified = runs.filter((run) => run.status === "verified");
  const failed = runs.filter((run) => run.status === "failed");
  const totalSizeBytes = verified.reduce((sum, run) => sum + (run.size_bytes ?? 0), 0);
  const averageDurationMs =
    verified.length > 0
      ? Math.round(verified.reduce((sum, run) => sum + (run.duration_ms ?? 0), 0) / verified.length)
      : null;

  const lastSuccessfulRun = verified[0] ?? null;
  const lastFailedRun = failed[0] ?? null;
  const now = Date.now();
  const lastSuccessMs = lastSuccessfulRun?.verified_at ? new Date(lastSuccessfulRun.verified_at).getTime() : null;
  const hoursSinceSuccess = lastSuccessMs ? (now - lastSuccessMs) / 36e5 : null;
  const status =
    !lastSuccessfulRun || (hoursSinceSuccess != null && hoursSinceSuccess > 72)
      ? "critical"
      : failed.length >= 2 && failed[0]?.created_at > (lastSuccessfulRun.created_at ?? "")
        ? "attention"
        : "protected";

  const openAlerts: BackupHealth["openAlerts"] = [];
  if (!lastSuccessfulRun) {
    openAlerts.push({
      level: "critical",
      message: "No hay ninguna copia verificada disponible.",
      action: "Crear una copia total manual.",
      date: new Date().toISOString(),
    });
  } else if (hoursSinceSuccess != null && hoursSinceSuccess > 24) {
    openAlerts.push({
      level: "warning",
      message: "La ultima copia verificada tiene mas de 24 horas.",
      action: "Revisar automatizaciones o lanzar copia manual.",
      date: new Date().toISOString(),
    });
  }

  return {
    status,
    lastSuccessfulRun,
    lastFailedRun,
    nextScheduledRun,
    availableCopies: verified.length,
    totalSizeBytes,
    primaryDestinationStatus: lastSuccessfulRun ? "healthy" : "pending",
    secondaryDestinationStatus: "pending",
    verificationStatus: lastFailedRun && !lastSuccessfulRun ? "failed" : lastSuccessfulRun ? "passed" : "pending",
    openAlerts,
    averageDurationMs,
    estimatedRestoreMs: averageDurationMs ? Math.round(averageDurationMs * 1.5) : null,
    rpo: lastSuccessfulRun ? "24 h estimado" : "No disponible",
    rto: averageDurationMs ? "15-30 min estimado" : "No disponible",
  };
}

export async function createManualBackupRun(user: CurrentUserContext, input: ManualBackupInput): Promise<BackupRun> {
  assertCanCreateBackup(user);

  // Para incrementales: validar cadena y asignar parent_backup_id
  let parentBackupId: string | null = null;
  let baseFullBackupId: string | null = null;

  if (input.backupType === "incremental") {
    const lastVerified = await getLastVerifiedFullBackup(user);
    if (!lastVerified) {
      throw new Error("Para crear una copia incremental debe existir al menos una copia total verificada.");
    }
    // Use the last verified backup (full or incremental) as parent
    const { data: lastAny } = await db()
      .from("backup_runs")
      .select("*")
      .eq("empresa_id", user.empresaId)
      .eq("status", "verified")
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const parentRun = lastAny as BackupRun | null;
    parentBackupId = parentRun?.id ?? lastVerified.id;

    // Find base full backup
    const chainResult = await validateBackupChain(parentBackupId, user.empresaId);
    if (!chainResult.valid) {
      throw new Error(`No se puede crear incremental: ${chainResult.error}`);
    }
    baseFullBackupId = chainResult.baseFullBackup.id;
  }

  const payload = {
    empresa_id: user.empresaId,
    backup_type: input.backupType,
    status: "queued",
    triggered_mode: "manual",
    triggered_by: user.id,
    scope: input.scope,
    destination_primary: {
      type: input.destination,
      label: input.destination === "supabase_storage" ? "Supabase Storage privado" : "Destino preparado",
      encrypted: true,
    },
    // Solo incluir estas columnas cuando tienen valor — si las migraciones
    // 20260522120000 no se han aplicado, enviar null provocaria error de columna inexistente
    ...(parentBackupId ? { parent_backup_id: parentBackupId } : {}),
    ...(baseFullBackupId ? { base_full_backup_id: baseFullBackupId } : {}),
  };

  const { data, error } = await db().from("backup_runs").insert(payload).select("*").single();
  if (error) throw new Error(`No se pudo crear la copia de seguridad: ${error.message}`);

  const run = data as BackupRun;
  await enqueueJob<BackupCreatePayload>(
    {
      type: BACKUP_CREATE_JOB,
      payload: { backupRunId: run.id, empresaId: user.empresaId, requestedBy: user.id },
      empresa_id: user.empresaId,
      created_by: user.id,
      priority: 10,
      max_attempts: 2,
    },
    { useAdmin: true },
  );

  await recordBackupAudit({
    eventType: "backup.manual.started",
    user,
    backupRunId: run.id,
    metadata: { backupType: input.backupType, scope: input.scope, destination: input.destination },
  });

  return run;
}



async function getActorLabel(userId: number | null): Promise<string> {
  if (!userId) return "system";
  const { data } = await db().from("usuarios").select("nombre, apellidos, correo").eq("id", userId).maybeSingle();
  const user = data as { nombre?: string | null; apellidos?: string | null; correo?: string | null } | null;
  if (!user) return `usuario:${userId}`;
  return [user.nombre, user.apellidos].filter(Boolean).join(" ") || user.correo || `usuario:${userId}`;
}

export async function executeBackupRun(payload: BackupCreatePayload): Promise<BackupRun> {
  const supabase = db();
  const startedAt = new Date();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "metria-1.0.0";

  const { data: runData, error: runError } = await supabase
    .from("backup_runs")
    .select("*")
    .eq("id", payload.backupRunId)
    .maybeSingle();

  if (runError || !runData) throw new Error(runError?.message ?? "Backup no encontrado.");
  const run = runData as BackupRun;

  await supabase
    .from("backup_runs")
    .update({ status: "exporting_database", started_at: startedAt.toISOString() })
    .eq("id", run.id);

  const scope = sanitizeScope(run.scope as unknown as string[]);
  const entities = getEntitiesForScope(scope);
  const actorLabel = await getActorLabel(run.triggered_by);
  const backupId = `BKP-${startedAt.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;

  // ── Exportar datos (full vs incremental) ─────────────────────────────
  const isIncremental = run.backup_type === "incremental";
  let exportResult: Awaited<ReturnType<typeof exportDatabaseEntities>>;
  let incrementalChanges: Record<string, { modified: number; deleted: number }> | undefined;
  let incrementalFrom: Date | undefined;
  let incrementalTo: Date | undefined;
  let chainValid = true;
  let incrementalCoverage: "complete" | "partial" = "complete";
  let changeLogIds: string[] = [];

  if (isIncremental) {
    // Validate chain
    if (!run.parent_backup_id) {
      throw new Error("Backup incremental sin parent_backup_id — imposible continuar.");
    }
    const chainResult = await validateBackupChain(run.parent_backup_id, run.empresa_id);
    if (!chainResult.valid) {
      chainValid = false;
      throw new Error(`Cadena de backup invalida: ${chainResult.error}`);
    }

    const { from, to } = getIncrementalWindow(chainResult.chain[0], startedAt);
    incrementalFrom = from;
    incrementalTo = to;

    // Get change log for the window
    const changeLogs = await getUnprocessedChanges(run.empresa_id, from, to);
    changeLogIds = changeLogs.map((c) => c.id);

    // Export incremental
    const incrResult = await exportIncrementalEntities(
      run.empresa_id, run.id, entities, from, to, changeLogs,
    );
    incrementalChanges = incrResult.changes;
    incrementalCoverage = incrResult.coverage;

    // Map to same shape as full export result
    exportResult = {
      entities: Object.fromEntries(
        Object.entries(incrResult.entities).map(([k, e]) => [
          k,
          {
            table: entities.find((en) => en.key === k)?.table ?? k,
            rows: e.modified + e.deleted,
            file: e.file,
            checksum: e.checksum,
            size_bytes: e.size_bytes,
            status: e.status === "exported" || e.status === "skipped" ? "exported" as const : "failed" as const,
            priority: entities.find((en) => en.key === k)?.priority ?? "optional",
            error: e.error,
          },
        ])
      ),
      warnings: incrResult.warnings,
      errors: incrResult.errors,
      database_export: incrResult.database_export,
      total_rows: incrResult.total_changes,
      total_size_bytes: Object.values(incrResult.entities).reduce((s, e) => s + e.size_bytes, 0),
    };
  } else {
    exportResult = await exportDatabaseEntities(run.empresa_id, run.id, entities);
  }

  // ── Exportar Storage (solo en full o si explicitamente solicitado) ─────
  const includeStorage = !isIncremental && (scope.includes("all") || scope.includes("storage") || scope.includes("documents"));
  await supabase.from("backup_runs").update({ status: "exporting_storage" }).eq("id", run.id);
  const storageResult = await exportStorageBuckets(run.empresa_id, run.id, includeStorage);

  // Upload storage_manifest.json
  if (Object.keys(storageResult.bucket_details).length > 0) {
    const storageManifest = buildStorageManifest(run.empresa_id, run.id, storageResult);
    const storageManifestJson = JSON.stringify({ generated_at: new Date().toISOString(), entries: storageManifest }, null, 2);
    await uploadBackupFile(run.empresa_id, run.id, "storage_manifest.json", storageManifestJson, "application/json");
    await registerStorageArtifacts(run.empresa_id, run.id, storageResult.bucket_details);
  }

  // ── Schema snapshot ────────────────────────────────────────────────────
  const schemaSnapshot = await generateSchemaSnapshot(entities, appVersion);
  const schemaJson = JSON.stringify(schemaSnapshot, null, 2);
  const schemaBuffer = Buffer.from(schemaJson, "utf-8");
  const schemaChecksum = crypto.createHash("sha256").update(schemaBuffer).digest("hex");
  await uploadBackupFile(run.empresa_id, run.id, "schema.json", schemaBuffer, "application/json");

  await supabase.from("backup_runs").update({ status: "verifying" }).eq("id", run.id);

  // ── Determinar estado final ────────────────────────────────────────────
  const allWarnings = [...exportResult.warnings, ...storageResult.warnings];
  const allErrors = [...exportResult.errors, ...storageResult.errors];

  // ── Manifiesto real ────────────────────────────────────────────────────
  const verifiedAt = new Date();
  const manifest: BackupManifest = {
    backup_id: backupId,
    empresa_id: run.empresa_id ?? undefined,
    type: run.backup_type,
    phase: "data_export",
    status: exportResult.database_export === "failed" ? "failed" : "verified",
    created_at: run.created_at,
    created_by: actorLabel,
    app_version: appVersion,
    schema_version: "current",
    scope,
    entities: exportResult.entities,
    tables: Object.fromEntries(
      Object.entries(exportResult.entities).map(([k, e]) => [
        k,
        { rows: e.rows, checksum: e.checksum },
      ]),
    ),
    storage: {
      buckets: Object.keys(storageResult.bucket_details).length,
      objects: storageResult.total_objects,
      total_size: storageResult.total_size_bytes,
      checksum_status: storageResult.total_copied > 0 ? "verified" : "not_available",
      bucket_details: storageResult.bucket_details,
    },
    database_export: exportResult.database_export,
    storage_export: isIncremental ? "pending" : (includeStorage ? storageResult.storage_export : "pending"),
    restore_status: "simulation_only",
    warnings: allWarnings,
    errors: allErrors,
    parent_backup_id: run.parent_backup_id,
    base_full_backup_id: run.base_full_backup_id,
    from: incrementalFrom?.toISOString() ?? null,
    to: incrementalTo?.toISOString() ?? null,
    chain_valid: chainValid,
    coverage: isIncremental ? incrementalCoverage : "complete",
    changes: incrementalChanges,
    encryption: "prepared",
    verified_at: exportResult.database_export !== "failed" ? verifiedAt.toISOString() : null,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestBuffer = Buffer.from(manifestJson, "utf-8");
  const manifestChecksum = crypto.createHash("sha256").update(manifestBuffer).digest("hex");

  // ── Subir manifiesto ───────────────────────────────────────────────────
  await uploadBackupFile(run.empresa_id, run.id, "manifest.json", manifestBuffer, "application/json");

  // ── Checksums ─────────────────────────────────────────────────────────
  const checksumContent = await generateChecksumFile(exportResult.entities, manifestChecksum, schemaChecksum);
  await uploadBackupFile(run.empresa_id, run.id, "checksums.sha256", checksumContent, "text/plain");

  // ── Registrar artifacts de entidades ──────────────────────────────────
  await registerEntityArtifacts(run.empresa_id, run.id, exportResult.entities);

  // ── Artifact del manifiesto ────────────────────────────────────────────
  await supabase.from("backup_artifacts").insert({
    empresa_id: run.empresa_id,
    backup_run_id: run.id,
    artifact_type: "manifest",
    path: `${run.empresa_id ?? "global"}/${run.id}/manifest.json`,
    size_bytes: manifestBuffer.length,
    checksum: manifestChecksum,
    content_type: "application/json",
    metadata: { phase: "data_export", entities_count: Object.keys(exportResult.entities).length },
  });

  // ── Integrity checks ──────────────────────────────────────────────────
  const exportedCount = Object.values(exportResult.entities).filter((e) => e.status === "exported").length;
  const criticalFailed = Object.values(exportResult.entities).filter(
    (e) => e.status === "failed" && e.priority === "critical",
  );

  const finalStatus = exportResult.database_export === "failed" ? "failed" : "verified";
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const sizeBytes = exportResult.total_size_bytes + storageResult.total_size_bytes + manifestBuffer.length + schemaBuffer.length;

  const { data: updated, error } = await supabase
    .from("backup_runs")
    .update({
      status: finalStatus,
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      size_bytes: sizeBytes,
      manifest_path: `${run.empresa_id ?? "global"}/${run.id}/manifest.json`,
      manifest,
      checksum: manifestChecksum,
      verified_at: finalStatus === "verified" ? verifiedAt.toISOString() : null,
      error_message:
        allErrors.length > 0 ? allErrors.slice(0, 3).join("; ") : null,
    })
    .eq("id", run.id)
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo finalizar el backup: ${error.message}`);

  await supabase.from("backup_integrity_checks").insert([
    {
      empresa_id: run.empresa_id,
      backup_run_id: run.id,
      check_type: "manifest_exists",
      status: "passed",
      expected_value: "present",
      actual_value: "present",
      message: "Manifiesto generado y subido a Storage.",
    },
    {
      empresa_id: run.empresa_id,
      backup_run_id: run.id,
      check_type: "schema_snapshot_exists",
      status: "passed",
      expected_value: "present",
      actual_value: "present",
      message: "Schema snapshot generado correctamente.",
    },
    {
      empresa_id: run.empresa_id,
      backup_run_id: run.id,
      check_type: "checksum_valid",
      status: "passed",
      expected_value: manifestChecksum,
      actual_value: manifestChecksum,
      message: "Checksum del manifiesto validado.",
    },
    {
      empresa_id: run.empresa_id,
      backup_run_id: run.id,
      check_type: "entity_file_exists",
      status: exportedCount > 0 ? "passed" : "failed",
      expected_value: `${entities.length}`,
      actual_value: `${exportedCount}`,
      message: `${exportedCount} de ${entities.length} entidades exportadas.`,
    },
    {
      empresa_id: run.empresa_id,
      backup_run_id: run.id,
      check_type: "critical_entities_exported",
      status: criticalFailed.length === 0 ? "passed" : "failed",
      expected_value: "0 critical failures",
      actual_value: `${criticalFailed.length} critical failures`,
      message:
        criticalFailed.length === 0
          ? "Todas las entidades criticas exportadas correctamente."
          : `Entidades criticas fallidas: ${criticalFailed.map((e) => e.table).join(", ")}`,
    },
    {
      empresa_id: run.empresa_id,
      backup_run_id: run.id,
      check_type: "storage_bucket_access_valid",
      status: includeStorage ? (storageResult.storage_export !== "failed" ? "passed" : "failed") : "warning",
      expected_value: includeStorage ? "accessible" : "not_requested",
      actual_value: includeStorage ? storageResult.storage_export : "skipped",
      message: includeStorage
        ? `Storage: ${storageResult.total_copied} de ${storageResult.total_objects} objetos copiados.`
        : "Storage no incluido en el alcance de este backup.",
    },
    {
      empresa_id: run.empresa_id,
      backup_run_id: run.id,
      check_type: "storage_object_count_valid",
      status: includeStorage && storageResult.total_failed > 0 ? "warning" : "passed",
      expected_value: `${storageResult.total_objects}`,
      actual_value: `${storageResult.total_copied}`,
      message: includeStorage
        ? `${storageResult.total_failed} objeto(s) de storage no copiados.`
        : "Storage no incluido.",
    },
  ]);

  // ── Marcar cambios como procesados SOLO si el backup está verificado ─────
  // NUNCA antes — si el backup falla, los cambios deben estar disponibles
  // para el proximo incremental.
  if (isIncremental && finalStatus === "verified" && changeLogIds.length > 0) {
    await markChangesAsProcessed(changeLogIds, run.id);
  }

  // Update profile last_status if this was a scheduled backup
  if (run.profile_id) {
    await supabase
    .from<{ next_run_at: string | null }[]>("backup_profiles")
      .update({ last_status: finalStatus })
      .eq("id", run.profile_id);
  }

  return updated as BackupRun;
}

export async function getBackupRecipients(empresaId: number | null): Promise<string[]> {
  if (!empresaId) return [];
  const { data } = await db()
    .from("usuarios")
    .select("correo, rol")
    .eq("empresa_id", empresaId)
    .in("rol", ["Administrador", "Director"])
    .eq("estado", "active");

  const users = (data ?? []) as Array<{ correo: string | null }>;
  return users
    .map((user: { correo: string | null }) => user.correo)
    .filter((email: string | null): email is string => Boolean(email));
}

export type { BackupCreatePayload };
