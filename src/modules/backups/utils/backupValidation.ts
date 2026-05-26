import { z } from "zod";
import type { ManualBackupInput } from "../types/backup.types";

export const manualBackupSchema = z.object({
  backupType: z.enum(["full", "incremental"]),
  scope: z.array(z.string()).min(1, "Selecciona al menos un alcance."),
  destination: z.enum(["supabase_storage", "s3", "local_download", "external_provider"]),
  verificationLevel: z.enum(["basic", "complete", "restore_simulation"]),
  notifyCreator: z.boolean(),
  notifyAdmins: z.boolean(),
  notifyDirectors: z.boolean(),
  notifyMode: z.enum(["always", "failure_only"]),
  confirmationText: z.string().trim().min(1, "Confirma la accion para continuar."),
});

export function parseManualBackupInput(input: unknown): ManualBackupInput {
  return manualBackupSchema.parse(input) as ManualBackupInput;
}

export function isSensitiveManualBackup(input: ManualBackupInput): boolean {
  return input.backupType === "full" || input.destination === "local_download";
}
