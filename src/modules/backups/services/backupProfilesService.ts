import type { CurrentUserContext } from "@/lib/current-user";
import type { BackupProfile } from "../types/backup.types";
import { assertCanReadBackups } from "./backupPermissions";
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
