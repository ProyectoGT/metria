import type { JobHandler, JobScheduleDefinition } from "../types";
import { registerJobHandlers } from "../registry";
import { registerSchedules } from "../scheduler";
import { backupCreateJobHandler } from "../handlers/backups";
import { backupScheduleDueJobHandler } from "../handlers/backupScheduler";
import { backupRetentionCleanupJobHandler } from "../handlers/backupRetention";

const definitions: JobHandler[] = [
  backupCreateJobHandler as JobHandler,
  backupScheduleDueJobHandler,
  backupRetentionCleanupJobHandler,
];

// Schedules: backup scheduler every 5 min; retention review once daily
const schedules: JobScheduleDefinition[] = [
  {
    jobType: "backup.schedule_due",
    cronExpression: "*/5 * * * *",
    description: "Procesa perfiles de backup vencidos cada 5 minutos",
  },
  {
    jobType: "backup.retention.cleanup",
    cronExpression: "0 4 * * *",
    description: "Revision diaria de politica de retencion (solo dry-run)",
  },
];

export function registerBuiltinJobs(): void {
  if (definitions.length > 0) {
    registerJobHandlers(...definitions);
  }
  if (schedules.length > 0) {
    registerSchedules(...schedules);
  }
}
