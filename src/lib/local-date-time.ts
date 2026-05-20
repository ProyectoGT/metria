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

/**
 * Calcula la duración en minutos entre dos strings HH:MM.
 * Devuelve null si alguno es inválido o fin <= inicio.
 */
export function calcDurationMinutes(timeStart: string | null | undefined, timeEnd: string | null | undefined): number | null {
  if (!timeStart || !timeEnd) return null;
  const [h1, m1] = timeStart.split(":").map(Number);
  const [h2, m2] = timeEnd.split(":").map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  return diff > 0 ? diff : null;
}

/**
 * Formatea duración en minutos como "1h 30min", "45min", "2h", etc.
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Formatea la opción de recordatorio en texto legible.
 * Devuelve null si no hay recordatorio (minutes == null).
 */
export function formatReminderLabel(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  if (minutes === 0) return "Al inicio";
  if (minutes === 5) return "5 min antes";
  if (minutes === 15) return "15 min antes";
  if (minutes === 30) return "30 min antes";
  if (minutes === 60) return "1 hora antes";
  if (minutes === 1440) return "1 dia antes";
  if (minutes < 60) return `${minutes} min antes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h antes` : `${h}h ${m}min antes`;
}

/** Opciones estándar de recordatorio para selects/dropdowns */
export const REMINDER_OPTIONS = [
  { value: null,  label: "Sin recordatorio" },
  { value: 0,     label: "Al inicio del evento" },
  { value: 5,     label: "5 minutos antes" },
  { value: 15,    label: "15 minutos antes" },
  { value: 30,    label: "30 minutos antes" },
  { value: 60,    label: "1 hora antes" },
  { value: 1440,  label: "1 dia antes" },
] as const;
