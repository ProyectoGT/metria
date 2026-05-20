const VALID_INPUT_PATTERN = /^[0-9.,]*$/;

export function isValidNumberInput(value: string): boolean {
  if (typeof value !== "string") return false;
  if (value.trim() === "") return true;
  if (!VALID_INPUT_PATTERN.test(value)) return false;
  const commaCount = (value.match(/,/g) || []).length;
  if (commaCount > 1) return false;
  return true;
}

export function parseNumberInput(value: unknown, fallback = 0): number {
  if (typeof value === "number") return safeNumber(value, fallback);
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const hasComma = trimmed.includes(",");
  const normalized = hasComma
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/(?<=\d)\.(?=\d{3}(\D|$))/g, "");
  const parsed = Number(normalized);
  return safeNumber(parsed, fallback);
}

export function toSafeNumber(value: unknown, fallback = 0): number {
  return parseNumberInput(value, fallback);
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number") return fallback;
  return Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  const safe = safeNumber(value, min);
  return Math.min(Math.max(safe, min), max);
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function roundPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function numberInputText(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "";
  return decimals > 0 ? String(value).replace(".", ",") : String(Math.round(value));
}

export function isEmptyNumberInput(value: string): boolean {
  return value.trim() === "" || value.trim() === "-" || value.trim() === "," || value.trim() === ".";
}
