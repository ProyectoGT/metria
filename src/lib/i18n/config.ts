export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const localeStorageKey = "preferred-lang";

export const localeLabels: Record<Locale, { nativeName: string; englishName: string; region: string }> = {
  es: { nativeName: "Español", englishName: "Spanish", region: "es-ES" },
  en: { nativeName: "English", englishName: "English", region: "en-US" },
};

export const localeToHtmlLang: Record<Locale, string> = {
  es: "es",
  en: "en",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const normalized = value.toLowerCase().split("-")[0];
  return locales.includes(normalized as Locale) ? (normalized as Locale) : defaultLocale;
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return defaultLocale;
  const preferred = navigator.languages?.[0] ?? navigator.language;
  return normalizeLocale(preferred);
}
