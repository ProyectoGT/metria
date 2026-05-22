import type { JobHandler } from "../types";
import { backupDb } from "@/modules/backups/services/backupDb";
import { BACKUP_CREATE_JOB } from "@/jobs/constants";
import {
  executeBackupRun,
  getBackupRecipients,
  type BackupCreatePayload,
} from "@/modules/backups/services/backupRunsService";
import {
  notifyBackupCompleted,
  notifyBackupFailed,
} from "@/modules/backups/services/backupNotificationService";

export const backupCreateJobHandler: JobHandler<BackupCreatePayload> = {
  type: BACKUP_CREATE_JOB,
  displayName: "Crear copia de seguridad",
  description: "Genera manifiesto logico, verifica integridad basica y registra auditoria.",
  async handle(job, logger) {
    await logger.info("Generando copia logica de Metria", {
      backupRunId: job.payload.backupRunId,
      empresaId: job.payload.empresaId,
    });

    try {
      const run = await executeBackupRun(job.payload);
      const recipients = await getBackupRecipients(run.empresa_id);
      await notifyBackupCompleted({
        run,
        recipients,
        actorName: run.manifest?.created_by ?? "system",
      });
      await logger.info("Backup verificado", {
        backupRunId: run.id,
        checksum: run.checksum,
        sizeBytes: run.size_bytes,
      });
    } catch (error) {
      const { data: failedRun } = await backupDb()
        .from("backup_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq("id", job.payload.backupRunId)
        .select("*")
        .single();

      // Notify admins/directors of the failure
      if (failedRun && job.payload.empresaId) {
        const recipients = await getBackupRecipients(job.payload.empresaId);
        await notifyBackupFailed({
          run: failedRun as import("@/modules/backups/types/backup.types").BackupRun,
          recipients,
          actorName: "system",
        });
      }

      await logger.error("Fallo al ejecutar backup", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};
