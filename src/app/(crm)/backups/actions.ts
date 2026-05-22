"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/current-user";
import { createManualBackupRun } from "@/modules/backups/services/backupRunsService";
import { requestRestoreSimulation } from "@/modules/backups/services/backupRestoreService";
import { requireSensitiveActionConfirmation } from "@/modules/backups/services/sensitiveActionConfirmation";
import { parseManualBackupInput, isSensitiveManualBackup } from "@/modules/backups/utils/backupValidation";
import { BackupAuthorizationError } from "@/modules/backups/services/backupPermissions";

function safeErrorMessage(error: unknown, fallback: string): string {
  // Expose authorization messages (safe, user-facing) but swallow DB/internal details.
  if (error instanceof BackupAuthorizationError) return error.message;
  if (error instanceof Error && error.message.startsWith("Para crear una copia incremental")) return error.message;
  if (error instanceof Error && error.message.startsWith("Solo se pueden solicitar restauraciones")) return error.message;
  if (error instanceof Error && error.message.startsWith("Texto de confirmacion")) return error.message;
  return fallback;
}

export type BackupActionState =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string };

export async function createManualBackupAction(input: unknown): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };

    const parsed = parseManualBackupInput(input);
    if (isSensitiveManualBackup(parsed)) {
      await requireSensitiveActionConfirmation({
        user,
        confirmationText: parsed.confirmationText,
      });
    }

    const run = await createManualBackupRun(user, parsed);
    revalidatePath("/backups");
    return {
      ok: true,
      id: run.id,
      message: "Copia encolada. El worker la verificara en segundo plano.",
    };
  } catch (error) {
    return {
      ok: false,
      message: safeErrorMessage(error, "No se pudo crear la copia. Revisa el historial de errores."),
    };
  }
}

export async function requestRestoreSimulationAction(backupRunId: string): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };

    const id = await requestRestoreSimulation(user, backupRunId, "test_environment");
    revalidatePath("/backups");
    return { ok: true, id, message: "Solicitud de simulacion de restauracion creada." };
  } catch (error) {
    return {
      ok: false,
      message: safeErrorMessage(error, "No se pudo solicitar la restauracion."),
    };
  }
}
