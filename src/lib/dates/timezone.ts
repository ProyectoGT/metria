const MADRID_TIME_ZONE = "Europe/Madrid";

export type MadridDisplay = { date: string; time: string };

function partsInMadrid(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function madridOffsetMs(date: Date) {
  const madrid = partsInMadrid(date);
  const asUtc = Date.UTC(madrid.year, madrid.month - 1, madrid.day, madrid.hour, madrid.minute, madrid.second);
  return asUtc - date.getTime();
}

export function madridDateToUtc(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const firstPass = new Date(utcGuess.getTime() - madridOffsetMs(utcGuess));
  const secondPass = new Date(utcGuess.getTime() - madridOffsetMs(firstPass));
  return secondPass.toISOString();
}

export function utcToMadridDisplay(iso: string): MadridDisplay {
  const madrid = partsInMadrid(new Date(iso));
  return {
    date: `${madrid.year}-${String(madrid.month).padStart(2, "0")}-${String(madrid.day).padStart(2, "0")}`,
    time: `${String(madrid.hour).padStart(2, "0")}:${String(madrid.minute).padStart(2, "0")}`,
  };
}

export function getMadridTodayRangeUtc(): { startUtc: string; endUtc: string } {
  const today = utcToMadridDisplay(new Date().toISOString()).date;
  return {
    startUtc: madridDateToUtc(today, "00:00"),
    endUtc: madridDateToUtc(today, "23:59"),
  };
}

export function formatMadridDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function madridTodayDateKey(date = new Date()): string {
  return utcToMadridDisplay(date.toISOString()).date;
}

export function googleMadridDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export { MADRID_TIME_ZONE };
