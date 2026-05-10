export const locales = ["es", "en", "it", "ca"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const localeStorageKey = "preferred-lang";
export const localeCookieName = "locale";

export const localeLabels: Record<Locale, { nativeName: string; englishName: string; region: string }> = {
  es: { nativeName: "Español",  englishName: "Spanish",  region: "es-ES" },
  en: { nativeName: "English",  englishName: "English",  region: "en-GB" },
  it: { nativeName: "Italiano", englishName: "Italian",  region: "it-IT" },
  ca: { nativeName: "Català",   englishName: "Catalan",  region: "ca-ES" },
};

export const localeToHtmlLang: Record<Locale, string> = {
  es: "es",
  en: "en",
  it: "it",
  ca: "ca",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const normalized = value.toLowerCase().split("-")[0];
  return (locales as readonly string[]).includes(normalized)
    ? (normalized as Locale)
    : defaultLocale;
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return defaultLocale;
  const preferred = navigator.languages?.[0] ?? navigator.language;
  return normalizeLocale(preferred);
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${localeCookieName}=([^;]+)`));
  return match ? normalizeLocale(match[1]) : null;
}
