import type { CurrentUserContext } from "@/lib/current-user";
import type { BackupProfile, BackupProfileInput } from "../types/backup.types";
import { assertCanManageBackupProfiles, assertCanReadBackups } from "./backupPermissions";
import { calculateNextBackupRun } from "../utils/scheduleCalculator";
import { backupDb } from "./backupDb";

export const RECOMMENDED_BACKUP_PROFILES = [
  {
    name: "Backup critico diario",
    description: "Incremental diario a las 03:00 para base de datos, Storage y configuracion.",
    backup_type: "incremental",
    schedule_type: "daily",
    schedule_config: { hour: "03:00" },
    timezone: "Europe/Madrid",
    retention_policy: { incrementals_days: 30 },
  },
  {
    name: "Backup total semanal",
    description: "Copia total semanal los domingos a las 03:00 con retencion de 12 semanas.",
    backup_type: "full",
    schedule_type: "weekly",
    schedule_config: { day: "sunday", hour: "03:00" },
    timezone: "Europe/Madrid",
    retention_policy: { weekly_full_weeks: 12 },
  },
] as const;

export async function listBackupProfiles(user: CurrentUserContext): Promise<BackupProfile[]> {
  assertCanReadBackups(user);
  const { data, error } = await backupDb()
    .from("backup_profiles")
    .select("*")
    .eq("empresa_id", user.empresaId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las automatizaciones: ${error.message}`);
  return (data ?? []) as BackupProfile[];
}

export async function createBackupProfile(user: CurrentUserContext, input: BackupProfileInput): Promise<BackupProfile> {
  assertCanManageBackupProfiles(user);

  const { nextRun, error: calcError } = calculateNextBackupRun(
    {
      schedule_type: input.schedule_type,
      schedule_config: input.schedule_config,
      timezone: input.timezone,
      enabled: true,
    },
    new Date(),
  );

  const { data, error } = await backupDb()
    .from("backup_profiles")
    .insert({
      empresa_id: user.empresaId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      enabled: false,
      backup_type: input.backup_type,
      schedule_type: input.schedule_type,
      schedule_config: input.schedule_config,
      timezone: input.timezone,
      scope: input.scope,
      destination_primary: { type: "supabase_storage" },
      notify_on_success: input.notify_on_success,
      notify_on_failure: input.notify_on_failure,
      notify_admins: input.notify_admins,
      notify_directors: input.notify_directors,
      max_retries: input.max_retries,
      retry_delay_minutes: input.retry_delay_minutes,
      next_run_at: calcError ? null : (nextRun?.toISOString() ?? null),
      last_status: null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo crear el perfil: ${error.message}`);
  return data as BackupProfile;
}

export async function updateBackupProfile(
  user: CurrentUserContext,
  profileId: string,
  input: Partial<BackupProfileInput>,
): Promise<BackupProfile> {
  assertCanManageBackupProfiles(user);

  const { data: existing } = await backupDb()
    .from("backup_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("empresa_id", user.empresaId)
    .single();

  if (!existing) throw new Error("Perfil no encontrado.");

  const merged = { ...existing, ...input } as BackupProfile;
  const { nextRun } = calculateNextBackupRun(
    { schedule_type: merged.schedule_type, schedule_config: merged.schedule_config, timezone: merged.timezone, enabled: merged.enabled },
    new Date(),
  );

  const updates: Record<string, unknown> = {
    ...input,
    next_run_at: nextRun?.toISOString() ?? null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  if (input.name) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description?.trim() ?? null;

  const { data, error } = await backupDb()
    .from("backup_profiles")
    .update(updates)
    .eq("id", profileId)
    .eq("empresa_id", user.empresaId)
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo actualizar el perfil: ${error.message}`);
  return data as BackupProfile;
}

export async function toggleBackupProfile(
  user: CurrentUserContext,
  profileId: string,
  enabled: boolean,
): Promise<BackupProfile> {
  assertCanManageBackupProfiles(user);

  const { data: existing } = await backupDb()
    .from("backup_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("empresa_id", user.empresaId)
    .single();

  if (!existing) throw new Error("Perfil no encontrado.");

  const profile = existing as BackupProfile;
  let nextRun: Date | null = null;

  if (enabled) {
    const result = calculateNextBackupRun({ ...profile, enabled: true }, new Date());
    nextRun = result.nextRun;
  }

  const { data, error } = await backupDb()
    .from("backup_profiles")
    .update({
      enabled,
      next_run_at: enabled ? (nextRun?.toISOString() ?? null) : null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .eq("empresa_id", user.empresaId)
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo ${enabled ? "activar" : "desactivar"} el perfil: ${error.message}`);
  return data as BackupProfile;
}

export async function duplicateBackupProfile(user: CurrentUserContext, profileId: string): Promise<BackupProfile> {
  assertCanManageBackupProfiles(user);

  const { data: source } = await backupDb()
    .from("backup_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("empresa_id", user.empresaId)
    .single();

  if (!source) throw new Error("Perfil no encontrado.");

  const profile = source as BackupProfile;
  const { data, error } = await backupDb()
    .from("backup_profiles")
    .insert({
      empresa_id: user.empresaId,
      name: `${profile.name} (copia)`,
      description: profile.description,
      enabled: false,
      backup_type: profile.backup_type,
      schedule_type: profile.schedule_type,
      schedule_config: profile.schedule_config,
      timezone: profile.timezone,
      scope: profile.scope,
      destination_primary: profile.destination_primary,
      destination_secondary: profile.destination_secondary,
      retention_policy: profile.retention_policy,
      notify_on_success: profile.notify_on_success,
      notify_on_failure: profile.notify_on_failure,
      notify_admins: profile.notify_admins,
      notify_directors: profile.notify_directors,
      max_retries: profile.max_retries,
      retry_delay_minutes: profile.retry_delay_minutes,
      next_run_at: null,
      last_status: null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo duplicar el perfil: ${error.message}`);
  return data as BackupProfile;
}

export async function deleteBackupProfile(user: CurrentUserContext, profileId: string): Promise<void> {
  assertCanManageBackupProfiles(user);

  const { data: activeRuns } = await backupDb()
    .from("backup_runs")
    .select("id")
    .eq("profile_id", profileId)
    .in("status", ["queued", "running", "exporting_database", "verifying"])
    .limit(1);

  const runs = activeRuns as Array<{ id: string }> | null;
  if (runs && runs.length > 0) {
    throw new Error("No se puede eliminar un perfil con backups en curso.");
  }

  const { error } = await backupDb()
    .from("backup_profiles")
    .delete()
    .eq("id", profileId)
    .eq("empresa_id", user.empresaId);

  if (error) throw new Error(`No se pudo eliminar el perfil: ${error.message}`);
}

export async function recomputeProfileNextRun(profileId: string, empresaId: number | null): Promise<void> {
  const { data } = await backupDb()
    .from("backup_profiles")
    .select("schedule_type, schedule_config, timezone, enabled")
    .eq("id", profileId)
    .eq("empresa_id", empresaId)
    .single();

  if (!data) return;

  const { nextRun } = calculateNextBackupRun(
    { ...(data as { schedule_type: BackupProfile["schedule_type"]; schedule_config: Record<string, unknown>; timezone: string; enabled: boolean }) },
    new Date(),
  );

  await backupDb()
    .from("backup_profiles")
    .update({ next_run_at: nextRun?.toISOString() ?? null })
    .eq("id", profileId);
}
