import type { BackupScheduleType } from "../types/backup.types";

const WEEKDAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_LABELS: Record<string, string> = {
  sunday: "Domingo",
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
};

function getTimezoneOffset(date: Date, timezone: string): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  return new Date(utcStr).getTime() - new Date(tzStr).getTime();
}

function localToUTC(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimezoneOffset(candidate, timezone);
  return new Date(candidate.getTime() + offset);
}

function getCurrentInTimezone(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" })
    .format(date)
    .toLowerCase();
  return {
    year: parseInt(parts.year),
    month: parseInt(parts.month),
    day: parseInt(parts.day),
    hour: parseInt(parts.hour === "24" ? "0" : parts.hour),
    minute: parseInt(parts.minute),
    weekdayIndex: WEEKDAY_ORDER.indexOf(weekdayName),
  };
}

function parseHourMinute(hourStr: string): { hour: number; minute: number } | null {
  const match = hourStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { hour: h, minute: m };
}

export type NextRunResult = {
  nextRun: Date | null;
  error: string | null;
};

export function calculateNextBackupRun(
  profile: {
    schedule_type: BackupScheduleType;
    schedule_config: Record<string, unknown>;
    timezone: string;
    enabled: boolean;
  },
  fromDate: Date = new Date(),
): NextRunResult {
  if (!profile.enabled) return { nextRun: null, error: null };

  const config = profile.schedule_config;
  const tz = profile.timezone || "Europe/Madrid";

  try {
    switch (profile.schedule_type) {
      case "hourly": {
        const next = new Date(fromDate.getTime() + 60 * 60 * 1000);
        next.setSeconds(0, 0);
        return { nextRun: next, error: null };
      }

      case "every_x_hours": {
        const hours = typeof config.hours === "number" ? config.hours : 0;
        if (!hours || hours < 1 || hours > 23) {
          return { nextRun: null, error: "Horas debe ser entre 1 y 23." };
        }
        const next = new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
        next.setSeconds(0, 0);
        return { nextRun: next, error: null };
      }

      case "daily": {
        if (!config.hour || typeof config.hour !== "string") {
          return { nextRun: null, error: "Falta la hora de ejecucion." };
        }
        const hm = parseHourMinute(config.hour);
        if (!hm) return { nextRun: null, error: "Formato de hora incorrecto (usa HH:MM)." };

        const current = getCurrentInTimezone(fromDate, tz);
        let candidate = localToUTC(current.year, current.month, current.day, hm.hour, hm.minute, tz);

        if (candidate.getTime() <= fromDate.getTime()) {
          const nextDay = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
          const next = getCurrentInTimezone(nextDay, tz);
          candidate = localToUTC(next.year, next.month, next.day, hm.hour, hm.minute, tz);
        }
        return { nextRun: candidate, error: null };
      }

      case "weekly": {
        if (!config.hour || typeof config.hour !== "string") {
          return { nextRun: null, error: "Falta la hora de ejecucion." };
        }
        if (!config.day || typeof config.day !== "string") {
          return { nextRun: null, error: "Falta el dia de la semana." };
        }
        const hm = parseHourMinute(config.hour);
        if (!hm) return { nextRun: null, error: "Formato de hora incorrecto (usa HH:MM)." };
        const targetDay = WEEKDAY_ORDER.indexOf(config.day.toLowerCase());
        if (targetDay === -1) return { nextRun: null, error: "Dia de la semana no reconocido." };

        const current = getCurrentInTimezone(fromDate, tz);
        let daysAhead = targetDay - current.weekdayIndex;
        if (daysAhead < 0) daysAhead += 7;

        if (daysAhead === 0) {
          const candidateToday = localToUTC(current.year, current.month, current.day, hm.hour, hm.minute, tz);
          if (candidateToday.getTime() > fromDate.getTime()) {
            return { nextRun: candidateToday, error: null };
          }
          daysAhead = 7;
        }

        const targetDate = new Date(fromDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        const next = getCurrentInTimezone(targetDate, tz);
        const candidate = localToUTC(next.year, next.month, next.day, hm.hour, hm.minute, tz);
        return { nextRun: candidate, error: null };
      }

      case "monthly": {
        if (!config.hour || typeof config.hour !== "string") {
          return { nextRun: null, error: "Falta la hora de ejecucion." };
        }
        const monthDay = typeof config.monthDay === "number" ? config.monthDay : 0;
        if (!monthDay || monthDay < 1 || monthDay > 28) {
          return { nextRun: null, error: "El dia del mes debe ser entre 1 y 28." };
        }
        const hm = parseHourMinute(config.hour);
        if (!hm) return { nextRun: null, error: "Formato de hora incorrecto (usa HH:MM)." };

        const current = getCurrentInTimezone(fromDate, tz);
        let candidate = localToUTC(current.year, current.month, monthDay, hm.hour, hm.minute, tz);

        if (candidate.getTime() <= fromDate.getTime()) {
          let nextMonth = current.month + 1;
          let nextYear = current.year;
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
          }
          candidate = localToUTC(nextYear, nextMonth, monthDay, hm.hour, hm.minute, tz);
        }
        return { nextRun: candidate, error: null };
      }

      case "custom":
        return { nextRun: null, error: "Frecuencia personalizada no disponible todavia." };

      default:
        return { nextRun: null, error: "Tipo de programacion no reconocido." };
    }
  } catch {
    return { nextRun: null, error: "Error al calcular la proxima ejecucion." };
  }
}

export function describeSchedule(
  scheduleType: BackupScheduleType,
  scheduleConfig: Record<string, unknown>,
  timezone: string,
): string {
  const tz = timezone || "Europe/Madrid";
  try {
    switch (scheduleType) {
      case "hourly":
        return `Cada hora (${tz})`;
      case "every_x_hours": {
        const h = scheduleConfig.hours;
        return h ? `Cada ${h} horas (${tz})` : "Cada X horas";
      }
      case "daily": {
        const hour = scheduleConfig.hour;
        return hour ? `Diario a las ${hour} (${tz})` : "Diario";
      }
      case "weekly": {
        const day = typeof scheduleConfig.day === "string" ? scheduleConfig.day : "";
        const hour = scheduleConfig.hour;
        const dayLabel = WEEKDAY_LABELS[day.toLowerCase()] ?? day;
        return day && hour ? `Semanal — ${dayLabel} a las ${hour} (${tz})` : "Semanal";
      }
      case "monthly": {
        const d = scheduleConfig.monthDay;
        const hour = scheduleConfig.hour;
        return d && hour ? `Mensual — dia ${d} a las ${hour} (${tz})` : "Mensual";
      }
      case "custom":
        return "Personalizado (proximamente)";
      default:
        return "Programacion desconocida";
    }
  } catch {
    return "Programacion no disponible";
  }
}

export { WEEKDAY_LABELS };
