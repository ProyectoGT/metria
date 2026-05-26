"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/current-user";
import { createManualBackupRun } from "@/modules/backups/services/backupRunsService";
import {
  requestRestoreSimulation,
  startDryRun,
  getRestoreRun,
  listRestoreRuns,
  requestProductionRestore,
  approveProductionRestore,
  rejectProductionRestore,
  cancelRestore,
} from "@/modules/backups/services/backupRestoreService";
import type { RestoreExecutionResult } from "@/modules/backups/services/backupRestoreExecutionService";
import { requireSensitiveActionConfirmation } from "@/modules/backups/services/sensitiveActionConfirmation";
import { parseManualBackupInput, isSensitiveManualBackup } from "@/modules/backups/utils/backupValidation";
import { BackupAuthorizationError } from "@/modules/backups/services/backupPermissions";
import {
  createBackupProfile,
  updateBackupProfile,
  toggleBackupProfile,
  duplicateBackupProfile,
  deleteBackupProfile,
} from "@/modules/backups/services/backupProfilesService";
import {
  lockBackup,
  unlockBackup,
  getRetentionConfig,
  saveRetentionConfig,
  runRetentionCleanup,
} from "@/modules/backups/services/backupRetentionService";
import type {
  BackupProfileInput,
  RetentionPolicy,
  RetentionCleanupResult,
  RestoreRun,
} from "@/modules/backups/types/backup.types";

function safeErrorMessage(error: unknown, _fallback: string): string {
  if (error instanceof BackupAuthorizationError) return error.message;
  // Las funciones de backup son exclusivas de admin/director — mostrar el error real
  // para que puedan diagnosticar problemas (ej. columnas de BD faltantes, migraciones pendientes)
  if (error instanceof Error && error.message.length < 400) {
    return error.message;
  }
  return _fallback;
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

    const id = await requestRestoreSimulation(user, backupRunId);
    revalidatePath("/backups");
    return { ok: true, id, message: "Solicitud de simulacion de restauracion creada." };
  } catch (error) {
    return {
      ok: false,
      message: safeErrorMessage(error, "No se pudo solicitar la restauracion."),
    };
  }
}

export async function createBackupProfileAction(input: BackupProfileInput): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    const profile = await createBackupProfile(user, input);
    revalidatePath("/backups");
    return { ok: true, id: profile.id, message: "Perfil de automatizacion creado correctamente." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo crear el perfil.") };
  }
}

export async function updateBackupProfileAction(
  profileId: string,
  input: Partial<BackupProfileInput>,
): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await updateBackupProfile(user, profileId, input);
    revalidatePath("/backups");
    return { ok: true, message: "Perfil actualizado correctamente." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo actualizar el perfil.") };
  }
}

export async function toggleBackupProfileAction(
  profileId: string,
  enabled: boolean,
): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await toggleBackupProfile(user, profileId, enabled);
    revalidatePath("/backups");
    return { ok: true, message: enabled ? "Perfil activado." : "Perfil pausado." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo cambiar el estado del perfil.") };
  }
}

export async function duplicateBackupProfileAction(profileId: string): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    const copy = await duplicateBackupProfile(user, profileId);
    revalidatePath("/backups");
    return { ok: true, id: copy.id, message: "Perfil duplicado. Edita la copia y activala cuando estes listo." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo duplicar el perfil.") };
  }
}

export async function deleteBackupProfileAction(profileId: string): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await deleteBackupProfile(user, profileId);
    revalidatePath("/backups");
    return { ok: true, message: "Perfil eliminado." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo eliminar el perfil.") };
  }
}

// ── Retención ─────────────────────────────────────────────────────────────

export async function lockBackupAction(
  backupRunId: string,
  reason: string,
): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await lockBackup(user, backupRunId, reason);
    revalidatePath("/backups");
    return { ok: true, message: "Backup bloqueado correctamente." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo bloquear el backup.") };
  }
}

export async function unlockBackupAction(backupRunId: string): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await unlockBackup(user, backupRunId);
    revalidatePath("/backups");
    return { ok: true, message: "Backup desbloqueado correctamente." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo desbloquear el backup.") };
  }
}

export async function saveRetentionConfigAction(
  policy: RetentionPolicy,
): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await saveRetentionConfig(user, policy);
    revalidatePath("/backups");
    return { ok: true, message: "Politica de retencion guardada correctamente." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo guardar la politica.") };
  }
}

export type RetentionPreviewActionResult =
  | { ok: true; result: RetentionCleanupResult }
  | { ok: false; message: string };

export async function previewRetentionAction(): Promise<RetentionPreviewActionResult> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    const config = await getRetentionConfig(user.empresaId);
    const result = await runRetentionCleanup(user, config, true);
    return { ok: true, result };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo generar la vista previa.") };
  }
}

export async function executeRetentionCleanupAction(): Promise<RetentionPreviewActionResult> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    const config = await getRetentionConfig(user.empresaId);
    const result = await runRetentionCleanup(user, config, false);
    revalidatePath("/backups");
    return { ok: true, result };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo ejecutar la limpieza.") };
  }
}

// ── Restore / dry-run ──────────────────────────────────────────────────────

export type StartDryRunResult =
  | { ok: true; restoreRun: RestoreRun }
  | { ok: false; message: string };

export async function startDryRunAction(backupRunId: string): Promise<StartDryRunResult> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    const restoreRun = await startDryRun(user, backupRunId);
    return { ok: true, restoreRun };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo iniciar el analisis de restauracion.") };
  }
}

export type GetRestoreRunResult =
  | { ok: true; restoreRun: RestoreRun | null }
  | { ok: false; message: string };

export async function getRestoreRunAction(restoreRunId: string): Promise<GetRestoreRunResult> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    const restoreRun = await getRestoreRun(user, restoreRunId);
    return { ok: true, restoreRun };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo obtener el informe.") };
  }
}

export type ListRestoreRunsResult =
  | { ok: true; restoreRuns: RestoreRun[] }
  | { ok: false; message: string };

export async function listRestoreRunsAction(backupRunId?: string): Promise<ListRestoreRunsResult> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    const restoreRuns = await listRestoreRuns(user, backupRunId);
    return { ok: true, restoreRuns };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudieron cargar los analisis.") };
  }
}

// ── Restore productivo ────────────────────────────────────────────────────

export async function requestProductionRestoreAction(
  restoreRunId: string,
  selectedEntities: string[],
): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await requestProductionRestore(user, restoreRunId, selectedEntities);
    revalidatePath("/backups");
    return { ok: true, message: "Solicitud enviada. Esperando aprobacion de otro administrador." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo solicitar la restauracion.") };
  }
}

export async function approveProductionRestoreAction(restoreRunId: string): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await approveProductionRestore(user, restoreRunId);
    revalidatePath("/backups");
    return { ok: true, message: "Restauracion aprobada. Ya puede ejecutarse." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo aprobar la restauracion.") };
  }
}

export async function rejectProductionRestoreAction(
  restoreRunId: string,
  reason: string,
): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await rejectProductionRestore(user, restoreRunId, reason);
    revalidatePath("/backups");
    return { ok: true, message: "Solicitud rechazada." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo rechazar.") };
  }
}

export async function cancelRestoreAction(restoreRunId: string): Promise<BackupActionState> {
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };
    await cancelRestore(user, restoreRunId);
    revalidatePath("/backups");
    return { ok: true, message: "Solicitud cancelada." };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "No se pudo cancelar.") };
  }
}

export type ExecuteRestoreResult =
  | { ok: true; result: RestoreExecutionResult }
  | { ok: false; message: string };

export async function executeProductionRestoreAction(
  restoreRunId: string,
  backupRunId: string,
  selectedEntities: string[],
  confirmationText: string,
): Promise<ExecuteRestoreResult> {
  if (confirmationText !== "RESTAURAR PRODUCCION") {
    return { ok: false, message: "Texto de confirmacion incorrecto." };
  }
  try {
    const user = await getCurrentUserContext();
    if (!user) return { ok: false, message: "Sesion no valida." };

    // Verify the restore_run is approved
    const { data } = await (await import("@/modules/backups/services/backupDb")).backupDb()
      .from("restore_runs")
      .select("status, empresa_id")
      .eq("id", restoreRunId)
      .eq("empresa_id", user.empresaId)
      .maybeSingle();

    const rr = data as { status: string; empresa_id: number | null } | null;
    if (!rr) return { ok: false, message: "Solicitud no encontrada." };
    if (rr.status !== "approved") return { ok: false, message: "La solicitud debe estar aprobada antes de ejecutar." };

    const { executeProductionRestore } = await import("@/modules/backups/services/backupRestoreExecutionService");
    const result = await executeProductionRestore(user, restoreRunId, backupRunId, selectedEntities);
    revalidatePath("/backups");
    return { ok: true, result };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error, "Error durante la restauracion.") };
  }
}
