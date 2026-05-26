import type { CurrentUserContext } from "@/lib/current-user";
import type {
  BackupRun,
  RetentionPolicy,
  RetentionCandidate,
  RetentionCleanupResult,
} from "../types/backup.types";
import { assertCanManageBackupProfiles } from "./backupPermissions";
import { backupDb } from "./backupDb";

// Re-export default for convenience
export { DEFAULT_RETENTION_POLICY } from "../types/backup.types";

// ── Configuracion de retencion ─────────────────────────────────────────────

export async function getRetentionConfig(empresaId: number | null): Promise<RetentionPolicy> {
  if (!empresaId) return getDefaultPolicy();
  const { data } = await backupDb()
    .from("backup_retention_config")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (!data) return getDefaultPolicy();
  const row = data as Record<string, unknown>;
  return {
    incrementals_days: (row.incrementals_days as number) ?? 30,
    daily_full_days: (row.daily_full_days as number) ?? 30,
    weekly_full_weeks: (row.weekly_full_weeks as number) ?? 12,
    monthly_full_months: (row.monthly_full_months as number) ?? 12,
    annual_full_years: (row.annual_full_years as number) ?? 7,
    keep_min_copies: (row.keep_min_copies as number) ?? 3,
  };
}

export async function saveRetentionConfig(
  user: CurrentUserContext,
  policy: RetentionPolicy,
): Promise<void> {
  assertCanManageBackupProfiles(user);
  await backupDb()
    .from("backup_retention_config")
    .upsert(
      {
        empresa_id: user.empresaId,
        incrementals_days: policy.incrementals_days,
        daily_full_days: policy.daily_full_days,
        weekly_full_weeks: policy.weekly_full_weeks,
        monthly_full_months: policy.monthly_full_months,
        annual_full_years: policy.annual_full_years,
        keep_min_copies: policy.keep_min_copies,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "empresa_id" },
    );

  await backupDb().from("backup_audit_log").insert({
    empresa_id: user.empresaId,
    event_type: "backup.retention.policy.updated",
    user_id: user.id,
    user_role: user.role,
    metadata: { policy },
  });
}

function getDefaultPolicy(): RetentionPolicy {
  return {
    incrementals_days: 30,
    daily_full_days: 30,
    weekly_full_weeks: 12,
    monthly_full_months: 12,
    annual_full_years: 7,
    keep_min_copies: 3,
  };
}

// ── Bloqueo ────────────────────────────────────────────────────────────────

export async function lockBackup(
  user: CurrentUserContext,
  backupRunId: string,
  reason: string,
): Promise<void> {
  assertCanManageBackupProfiles(user);
  const { error } = await backupDb()
    .from("backup_runs")
    .update({
      status: "locked",
      locked_at: new Date().toISOString(),
      locked_by: user.id,
      locked_reason: reason,
    })
    .eq("id", backupRunId)
    .eq("empresa_id", user.empresaId);

  if (error) throw new Error(`No se pudo bloquear el backup: ${error.message}`);

  await backupDb().from("backup_audit_log").insert({
    empresa_id: user.empresaId,
    event_type: "backup.locked",
    backup_run_id: backupRunId,
    user_id: user.id,
    user_role: user.role,
    metadata: { reason },
  });
}

export async function unlockBackup(
  user: CurrentUserContext,
  backupRunId: string,
): Promise<void> {
  assertCanManageBackupProfiles(user);

  // Get current run to restore the pre-lock status
  const { data } = await backupDb()
    .from("backup_runs")
    .select("verified_at")
    .eq("id", backupRunId)
    .eq("empresa_id", user.empresaId)
    .maybeSingle();

  const run = data as { verified_at: string | null } | null;
  const restoreStatus = run?.verified_at ? "verified" : "failed";

  const { error } = await backupDb()
    .from("backup_runs")
    .update({
      status: restoreStatus,
      locked_at: null,
      locked_by: null,
      locked_reason: null,
    })
    .eq("id", backupRunId)
    .eq("empresa_id", user.empresaId);

  if (error) throw new Error(`No se pudo desbloquear el backup: ${error.message}`);

  await backupDb().from("backup_audit_log").insert({
    empresa_id: user.empresaId,
    event_type: "backup.unlocked",
    backup_run_id: backupRunId,
    user_id: user.id,
    user_role: user.role,
    metadata: {},
  });
}

// ── Cálculo de candidatos ──────────────────────────────────────────────────

function ageHours(run: BackupRun): number {
  const ref = run.verified_at ?? run.created_at;
  return (Date.now() - new Date(ref).getTime()) / 36e5;
}

function expirationThresholdHours(run: BackupRun, policy: RetentionPolicy): number | null {
  if (run.backup_type === "incremental") {
    return policy.incrementals_days * 24;
  }
  // Full backups: use the longest applicable retention
  const days = Math.max(
    policy.daily_full_days,
    policy.weekly_full_weeks * 7,
    policy.monthly_full_months * 30,
    policy.annual_full_years * 365,
  );
  return days * 24;
}

export async function getRetentionCandidates(
  empresaId: number | null,
  policy: RetentionPolicy,
): Promise<RetentionCandidate[]> {
  const { data } = await backupDb()
    .from("backup_runs")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });

  const allRuns = (data ?? []) as BackupRun[];
  const verifiedRuns = allRuns.filter((r) => r.status === "verified");

  if (verifiedRuns.length === 0) return [];

  // Build sets for quick lookup
  const lastVerified = verifiedRuns[0];
  const lastFull = verifiedRuns.find((r) => r.backup_type === "full");

  // Build set of parent IDs (backups that are parents of other backups)
  const parentIds = new Set(allRuns.map((r) => r.parent_backup_id).filter(Boolean));
  const baseFullIds = new Set(allRuns.map((r) => r.base_full_backup_id).filter(Boolean));

  const candidates: RetentionCandidate[] = [];

  for (const run of allRuns) {
    // Skip already expired or queued/running
    if (run.status === "expired") continue;
    if (["queued", "running", "exporting_database", "exporting_storage", "verifying"].includes(run.status)) continue;

    const age = ageHours(run);
    const threshold = expirationThresholdHours(run, policy);

    // Determine if candidate by age
    const isOld = threshold !== null && age > threshold;

    // Protection rules
    let protected_ = false;
    let protectionReason: string | undefined;

    if (run.status === "locked") {
      protected_ = true;
      protectionReason = `Bloqueado manualmente: ${run.locked_reason ?? "sin motivo"}`;
    } else if (run.id === lastVerified?.id) {
      protected_ = true;
      protectionReason = "Es la ultima copia verificada.";
    } else if (run.id === lastFull?.id) {
      protected_ = true;
      protectionReason = "Es la ultima copia total verificada.";
    } else if (parentIds.has(run.id)) {
      protected_ = true;
      protectionReason = "Tiene copias incrementales dependientes.";
    } else if (baseFullIds.has(run.id)) {
      protected_ = true;
      protectionReason = "Es la copia total base de una cadena incremental.";
    } else if (verifiedRuns.length <= (policy.keep_min_copies ?? 3)) {
      protected_ = true;
      protectionReason = `Minimo de ${policy.keep_min_copies} copias garantizado.`;
    }

    if (isOld || protected_) {
      candidates.push({
        run,
        protected: protected_,
        protectionReason,
        expirationReason: isOld && !protected_
          ? `Antigüedad superior al limite (${Math.round(age / 24)} dias).`
          : undefined,
        ageHours: age,
      });
    }
  }

  return candidates;
}

// ── Cleanup ────────────────────────────────────────────────────────────────

export async function runRetentionCleanup(
  user: CurrentUserContext,
  policy: RetentionPolicy,
  dryRun = true,
): Promise<RetentionCleanupResult> {
  assertCanManageBackupProfiles(user);

  const ranAt = new Date().toISOString();
  const allCandidates = await getRetentionCandidates(user.empresaId, policy);
  const toExpire = allCandidates.filter((c) => !c.protected && c.expirationReason);
  const errors: string[] = [];
  let expiredCount = 0;

  if (!dryRun) {
    for (const candidate of toExpire) {
      try {
        const { error } = await backupDb()
          .from("backup_runs")
          .update({
            status: "expired",
            expired_at: ranAt,
            expired_by: user.id,
            expiration_reason: candidate.expirationReason ?? "Politica de retencion",
          })
          .eq("id", candidate.run.id)
          .eq("empresa_id", user.empresaId);

        if (error) {
          errors.push(`${candidate.run.id}: ${error.message}`);
        } else {
          expiredCount++;
          await backupDb().from("backup_audit_log").insert({
            empresa_id: user.empresaId,
            event_type: "backup.retention.backup.expired",
            backup_run_id: candidate.run.id,
            user_id: user.id,
            user_role: user.role,
            metadata: {
              expiration_reason: candidate.expirationReason,
              age_hours: Math.round(candidate.ageHours),
              dry_run: false,
            },
          });
        }
      } catch (err) {
        errors.push(`${candidate.run.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Audit the whole cleanup run
    await backupDb().from("backup_audit_log").insert({
      empresa_id: user.empresaId,
      event_type: expiredCount > 0
        ? "backup.retention.cleanup.completed"
        : "backup.retention.cleanup.started",
      user_id: user.id,
      user_role: user.role,
      metadata: {
        dry_run: false,
        candidate_count: allCandidates.length,
        expired_count: expiredCount,
        protected_count: allCandidates.filter((c) => c.protected).length,
        error_count: errors.length,
      },
    });
  } else {
    // Dry-run audit
    await backupDb().from("backup_audit_log").insert({
      empresa_id: user.empresaId,
      event_type: "backup.retention.preview",
      user_id: user.id,
      user_role: user.role,
      metadata: {
        dry_run: true,
        candidate_count: allCandidates.length,
        would_expire: toExpire.length,
        protected_count: allCandidates.filter((c) => c.protected).length,
      },
    });
  }

  return {
    dry_run: dryRun,
    candidates: allCandidates,
    protected_count: allCandidates.filter((c) => c.protected).length,
    expired_count: dryRun ? 0 : expiredCount,
    already_expired_count: 0,
    errors,
    ran_at: ranAt,
  };
}
