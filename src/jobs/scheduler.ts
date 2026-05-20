import { createAdminClient } from "@/lib/supabase-admin";
import type { JobScheduleDefinition } from "./types";

const schedules = new Map<string, JobScheduleDefinition>();

function db() {
  return createAdminClient().from("job_schedules");
}

function jobs() {
  return createAdminClient().from("jobs");
}

export function registerSchedule(schedule: JobScheduleDefinition): void {
  if (schedules.has(schedule.jobType)) {
    console.warn(`[scheduler] Schedule already registered for "${schedule.jobType}", overwriting`);
  }
  schedules.set(schedule.jobType, schedule);
}

export function registerSchedules(...defs: JobScheduleDefinition[]): void {
  for (const def of defs) {
    registerSchedule(def);
  }
}

export function getRegisteredSchedules(): JobScheduleDefinition[] {
  return Array.from(schedules.values());
}

function parseCronExpression(expression: string): { interval: number; unit: string } | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minute = parts[0];
  const hour = parts[1];
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];

  if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return { interval: 1, unit: "minute" };
  }

  if (minute !== "*") {
    const m = parseInt(minute, 10);
    if (!isNaN(m) && hour === "*") return { interval: m, unit: "minute" };
  }

  if (minute === "0" && hour !== "*") {
    const h = parseInt(hour, 10);
    if (!isNaN(h)) return { interval: h, unit: "hour" };
  }

  if (minute === "0" && hour === "0" && dayOfMonth !== "*") {
    return { interval: 1, unit: "day" };
  }

  return null;
}

export async function runScheduler(): Promise<number> {
  let enqueued = 0;

  const registered = getRegisteredSchedules();
  if (registered.length === 0) return 0;

  const { data: dbSchedules } = await db().select("*");

  const dbMap = new Map<string, { last_enqueued_at: string | null; enabled: boolean }>();
  if (dbSchedules) {
    for (const s of dbSchedules as Array<{ job_type: string; last_enqueued_at: string | null; enabled: boolean }>) {
      dbMap.set(s.job_type, s);
    }
  }

  const now = new Date();

  for (const schedule of registered) {
    const dbSchedule = dbMap.get(schedule.jobType);

    if (dbSchedule && !dbSchedule.enabled) continue;

    const lastRun = dbSchedule?.last_enqueued_at
      ? new Date(dbSchedule.last_enqueued_at)
      : null;

    if (lastRun && !isDue(lastRun, now, schedule.cronExpression)) continue;

    await jobs().insert({
      type: schedule.jobType,
      payload: JSON.parse(JSON.stringify(schedule.payload ?? {})),
    });

    await db().upsert(
      {
        job_type: schedule.jobType,
        cron_expression: schedule.cronExpression,
        payload: JSON.parse(JSON.stringify(schedule.payload ?? {})),
        description: schedule.description ?? null,
        last_enqueued_at: now.toISOString(),
        enabled: true,
      },
      { onConflict: "job_type" },
    );

    enqueued++;
  }

  if (enqueued > 0) {
    console.log(`[scheduler] Enqueued ${enqueued} scheduled job(s)`);
  }

  return enqueued;
}

function isDue(lastRun: Date, now: Date, cronExpression: string): boolean {
  const parsed = parseCronExpression(cronExpression);
  if (!parsed) return false;

  const diffMs = now.getTime() - lastRun.getTime();
  const diffMinutes = diffMs / 60_000;

  switch (parsed.unit) {
    case "minute":
      return diffMinutes >= parsed.interval;
    case "hour":
      return diffMinutes >= parsed.interval * 60;
    case "day":
      return diffMinutes >= parsed.interval * 1440;
    default:
      return false;
  }
}

export function computeNextRun(cronExpression: string): string | null {
  const parsed = parseCronExpression(cronExpression);
  if (!parsed) return null;

  const now = new Date();

  switch (parsed.unit) {
    case "minute":
      now.setMinutes(now.getMinutes() + parsed.interval);
      break;
    case "hour":
      now.setHours(now.getHours() + parsed.interval);
      break;
    case "day":
      now.setDate(now.getDate() + parsed.interval);
      break;
    default:
      return null;
  }

  return now.toISOString();
}
