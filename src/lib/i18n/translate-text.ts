import { defaultLocale, localeStorageKey, normalizeLocale, type Locale } from "./config";
import { legacyPhrases } from "./legacy-phrases";

export function getClientLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  return normalizeLocale(window.localStorage.getItem(localeStorageKey) ?? undefined);
}

export function translateVisibleText(value: string, locale: Locale = getClientLocale()): string {
  if (locale === defaultLocale) return value;

  const map = legacyPhrases[locale];
  const trimmed = value.trim();
  const exact = map[trimmed];
  if (exact) return value.replace(trimmed, exact);

  const replacements: Array<[RegExp, string]> = [
    [/^Error al eliminar: (.+)$/i, "Error deleting: $1"],
    [/^Error al crear (.+): (.+)$/i, "Error creating $1: $2"],
    [/^Error al actualizar: (.+)$/i, "Error updating: $1"],
    [/^Error al guardar: (.+)$/i, "Error saving: $1"],
    [/^Error: (.+)$/i, "Error: $1"],
    [/^(.+) contactos exportados$/i, "$1 contacts exported"],
    [/^(.+) contactos importados$/i, "$1 contacts imported"],
    [/^(.+) leads? nuevos? importados? de Idealista$/i, "$1 new Idealista leads imported"],
    [/^Actividad guardada localmente\. (.+)$/i, "Activity saved locally. $1"],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }

  return value;
}
