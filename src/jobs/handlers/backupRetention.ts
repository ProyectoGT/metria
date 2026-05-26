import type { JobHandler } from "../types";
import { getRetentionConfig, getRetentionCandidates } from "@/modules/backups/services/backupRetentionService";
import { backupDb } from "@/modules/backups/services/backupDb";

// El job de retención SIEMPRE corre en modo dry-run.
// La limpieza real solo la puede ejecutar un admin desde la UI.
export const backupRetentionCleanupJobHandler: JobHandler = {
  type: "backup.retention.cleanup",
  displayName: "Revision de politica de retencion",
  description: "Analiza backups candidatos a expirar sin modificar nada. Solo vista previa.",
  async handle(job, logger) {
    const { empresaId } = job.payload as { empresaId?: number | null };

    if (!empresaId) {
      await logger.warn("Job de retencion sin empresaId — omitido");
      return;
    }

    await logger.info("Revisando politica de retencion (dry-run)", { empresaId });

    const policy = await getRetentionConfig(empresaId);
    const candidates = await getRetentionCandidates(empresaId, policy);

    const toExpire = candidates.filter((c) => !c.protected && c.expirationReason);
    const protected_ = candidates.filter((c) => c.protected);

    await logger.info("Revision de retencion completada (sin cambios)", {
      total_candidates: candidates.length,
      would_expire: toExpire.length,
      protected: protected_.length,
    });

    if (toExpire.length > 0) {
      // Leave an audit trace for admin review
      await backupDb().from("backup_audit_log").insert({
        empresa_id: empresaId,
        event_type: "backup.retention.preview",
        metadata: {
          dry_run: true,
          automated: true,
          would_expire: toExpire.length,
          protected: protected_.length,
          oldest_candidate_hours: toExpire[0]
            ? Math.round(toExpire[0].ageHours)
            : null,
        },
      });
    }
  },
};
