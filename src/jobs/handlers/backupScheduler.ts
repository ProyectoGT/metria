import type { JobHandler } from "../types";
import { BACKUP_SCHEDULE_DUE_JOB } from "@/jobs/constants";
import { processDueProfiles } from "@/modules/backups/services/backupSchedulerService";

export const backupScheduleDueJobHandler: JobHandler = {
  type: BACKUP_SCHEDULE_DUE_JOB,
  displayName: "Procesar backups programados",
  description: "Detecta perfiles de backup vencidos y encola los jobs correspondientes.",
  async handle(_job, logger) {
    await logger.info("Buscando perfiles de backup vencidos");

    const result = await processDueProfiles();

    await logger.info("Scheduler de backups completado", {
      processed: result.processed,
      enqueued: result.enqueued,
      skipped: result.skipped,
      errorCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      await logger.warn("Algunos perfiles fallaron durante el scheduler", {
        errors: result.errors.slice(0, 10),
      });
    }

    if (result.enqueued === 0 && result.processed > 0) {
      await logger.info("Todos los perfiles vencidos fueron omitidos (backup en curso)");
    }
  },
};
