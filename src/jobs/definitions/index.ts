import type { JobHandler, JobScheduleDefinition } from "../types";
import { registerJobHandlers } from "../registry";
import { registerSchedules } from "../scheduler";

const definitions: JobHandler[] = [];

const schedules: JobScheduleDefinition[] = [];

export function registerBuiltinJobs(): void {
  if (definitions.length > 0) {
    registerJobHandlers(...definitions);
  }
  if (schedules.length > 0) {
    registerSchedules(...schedules);
  }
}
