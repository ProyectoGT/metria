import { googleMadridDateTime, madridTodayDateKey } from "@/lib/dates/timezone";

export const DEFAULT_ACTIVITY_TIME = "09:00";

export function localDateKey(date = new Date()): string {
  return madridTodayDateKey(date);
}

export function normalizeDateKey(value: string): string {
  return value.slice(0, 10);
}

export function normalizeTime(value: string | null | undefined, fallback = DEFAULT_ACTIVITY_TIME): string {
  if (!value) return fallback;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

export function splitLocalDateTime(value: string | null | undefined): { date: string | null; time: string | null } {
  if (!value) return { date: null, time: null };
  const [date, time] = value.split("T");
  return { date: date || null, time: time ? normalizeTime(time, "") : null };
}

export function combineLocalDateTime(date: string, time: string): string {
  return `${date}T${normalizeTime(time)}:00`;
}

export function formatLocalDateEs(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function googleCalendarDateTime(date: string, time: string): string {
  return googleMadridDateTime(date, normalizeTime(time));
}
