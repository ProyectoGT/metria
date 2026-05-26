import { enqueueJob } from "@/jobs";
import { BACKUP_CREATE_JOB } from "@/jobs/constants";
import { calculateNextBackupRun } from "../utils/scheduleCalculator";
import type { BackupProfile, BackupRun } from "../types/backup.types";
import type { BackupCreatePayload } from "./backupRunsService";
import { backupDb } from "./backupDb";
import { validateBackupChain, getLastVerifiedFull } from "./backupChainService";

type SchedulerResult = {
  processed: number;
  enqueued: number;
  skipped: number;
  errors: string[];
};

async function recordSystemAudit(
  empresaId: number | null,
  profileId: string,
  eventType: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await backupDb().from("backup_audit_log").insert({
      empresa_id: empresaId,
      event_type: eventType,
      profile_id: profileId,
      metadata,
    });
  } catch {
    // Audit failure must not block scheduling
  }
}

export async function processDueProfiles(): Promise<SchedulerResult> {
  const db = backupDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const result: SchedulerResult = { processed: 0, enqueued: 0, skipped: 0, errors: [] };

  const { data: rawProfiles, error } = await db
    .from<BackupProfile>("backup_profiles")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", nowIso)
    .not("next_run_at", "is", null);

  if (error) {
    result.errors.push(`Error al buscar perfiles vencidos: ${error.message}`);
    return result;
  }

  const dueProfiles = (rawProfiles ?? []) as BackupProfile[];
  if (dueProfiles.length === 0) return result;

  for (const profile of dueProfiles) {
    result.processed++;

    try {
      // Validate schedule config
      const { nextRun, error: calcError } = calculateNextBackupRun(profile, now);

      if (calcError) {
        await db
          .from("backup_profiles")
          .update({ last_status: "config_error", updated_at: nowIso })
          .eq("id", profile.id);
        await recordSystemAudit(profile.empresa_id, profile.id, "backup.schedule.invalid_config", {
          error: calcError,
        });
        result.errors.push(`Perfil ${profile.name} (${profile.id}): configuracion invalida — ${calcError}`);
        continue;
      }

      // Check for in-progress backup for this profile (race condition guard)
      const { data: rawActiveRuns } = await db
        .from<{ id: string; status: string }>("backup_runs")
        .select("id, status")
        .eq("profile_id", profile.id)
        .in("status", ["queued", "running", "exporting_database", "verifying"])
        .limit(1);

      const activeRuns = (rawActiveRuns ?? []) as Array<{ id: string; status: string }>;

      if (activeRuns.length > 0) {
        // Advance next_run_at without launching a new run
        if (nextRun) {
          await db
            .from("backup_profiles")
            .update({ next_run_at: nextRun.toISOString(), updated_at: nowIso })
            .eq("id", profile.id);
        }
        await recordSystemAudit(profile.empresa_id, profile.id, "backup.schedule.skipped", {
          reason: "backup_in_progress",
          active_run_id: activeRuns[0].id,
        });
        result.skipped++;
        continue;
      }

      // Para perfiles incrementales: validar cadena antes de crear el run
      let parentBackupId: string | null = null;
      let baseFullBackupId: string | null = null;

      if (profile.backup_type === "incremental") {
        const lastFull = await getLastVerifiedFull(profile.empresa_id);
        if (!lastFull) {
          await recordSystemAudit(profile.empresa_id, profile.id, "backup.schedule.skipped", {
            reason: "no_verified_full_backup",
          });
          await db
            .from("backup_profiles")
            .update({ next_run_at: nextRun?.toISOString() ?? null, last_status: "no_full_backup" })
            .eq("id", profile.id);
          result.skipped++;
          result.errors.push(`Perfil ${profile.name}: no hay backup total verificado para crear incremental.`);
          continue;
        }

        // Find last verified backup (full or incremental) as parent
        const { data: lastAny } = await db
          .from<BackupRun>("backup_runs")
          .select("*")
          .eq("empresa_id", profile.empresa_id)
          .eq("status", "verified")
          .order("verified_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const parentRun = lastAny as BackupRun | null;
        if (!parentRun) {
          result.skipped++;
          continue;
        }

        const chainResult = await validateBackupChain(parentRun.id, profile.empresa_id);
        if (!chainResult.valid) {
          await recordSystemAudit(profile.empresa_id, profile.id, "backup.schedule.skipped", {
            reason: "broken_chain",
            error: chainResult.error,
          });
          result.skipped++;
          result.errors.push(`Perfil ${profile.name}: cadena rota — ${chainResult.error}`);
          continue;
        }

        parentBackupId = parentRun.id;
        baseFullBackupId = chainResult.baseFullBackup.id;
      }

      // Create backup_run
      const scope = Array.isArray(profile.scope) && profile.scope.length > 0 ? profile.scope : ["all"];
      const { data: newRun, error: runError } = await db
        .from<{ id: string }>("backup_runs")
        .insert({
          empresa_id: profile.empresa_id,
          profile_id: profile.id,
          backup_type: profile.backup_type,
          status: "queued",
          triggered_mode: "scheduled",
          triggered_by: null,
          scope,
          destination_primary: profile.destination_primary ?? { type: "supabase_storage" },
          destination_secondary: profile.destination_secondary ?? null,
          ...(parentBackupId ? { parent_backup_id: parentBackupId } : {}),
          ...(baseFullBackupId ? { base_full_backup_id: baseFullBackupId } : {}),
        })
        .select("id")
        .single();

      if (runError || !newRun) {
        result.errors.push(`Perfil ${profile.name}: error creando backup_run: ${runError?.message ?? "desconocido"}`);
        continue;
      }

      const createdRun = newRun as { id: string };

      // Enqueue job
      await enqueueJob<BackupCreatePayload>(
        {
          type: BACKUP_CREATE_JOB,
          payload: {
            backupRunId: createdRun.id,
            empresaId: profile.empresa_id,
            requestedBy: 0,
          },
          empresa_id: profile.empresa_id,
          priority: 5,
          max_attempts: Math.max(1, (profile.max_retries ?? 2) + 1),
        },
        { useAdmin: true },
      );

      // Update profile state
      await db
        .from("backup_profiles")
        .update({
          last_run_at: nowIso,
          next_run_at: nextRun?.toISOString() ?? null,
          last_status: "running",
          updated_at: nowIso,
        })
        .eq("id", profile.id);

      await recordSystemAudit(profile.empresa_id, profile.id, "backup.schedule.enqueued", {
        backup_run_id: createdRun.id,
        backup_type: profile.backup_type,
        next_run_at: nextRun?.toISOString(),
      });

      result.enqueued++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Perfil ${profile.name} (${profile.id}): ${msg}`);
    }
  }

  return result;
}
