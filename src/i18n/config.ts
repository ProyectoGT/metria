export const locales = ["es", "it"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const LOCALE_COOKIE = "metria_locale";
export const LOCALE_STORAGE_KEY = "metria_locale";

export const localeConfig: Record<Locale, { name: string; flag: string; region: string }> = {
  es: { name: "Español",  flag: "🇪🇸", region: "es-ES" },
  it: { name: "Italiano", flag: "🇮🇹", region: "it-IT" },
};
