import { defaultLocale, LOCALE_COOKIE, LOCALE_STORAGE_KEY, locales, type Locale } from "./config";

type NestedMessages = { [key: string]: string | NestedMessages };

export function flattenMessages(obj: NestedMessages, prefix = ""): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      acc[path] = value;
    } else {
      Object.assign(acc, flattenMessages(value, path));
    }
    return acc;
  }, {});
}

export function interpolate(
  template: string,
  params?: Record<string, string | number | Date | null | undefined>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value == null) return "";
    if (value instanceof Date) return value.toISOString();
    return String(value);
  });
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const normalized = value.toLowerCase().split("-")[0];
  return (locales as readonly string[]).includes(normalized)
    ? (normalized as Locale)
    : defaultLocale;
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const cookieMatch = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`),
  );
  const fromCookie = cookieMatch?.[1] ?? null;
  const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return resolveLocale(fromCookie ?? fromStorage);
}

export function storeLocale(locale: Locale): void {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}
