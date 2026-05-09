"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultLocale,
  detectBrowserLocale,
  localeLabels,
  localeStorageKey,
  localeToHtmlLang,
  normalizeLocale,
  type Locale,
} from "./config";
import { dictionaries, flattenMessages } from "./dictionaries";

type Params = Record<string, string | number | Date | null | undefined>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
  plural: (count: number, oneKey: string, otherKey: string, params?: Params) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value == null) return "";
    if (value instanceof Date) return value.toISOString();
    return String(value);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = window.localStorage.getItem(localeStorageKey);
      setLocaleState(stored ? normalizeLocale(stored) : detectBrowserLocale());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(localeStorageKey, nextLocale);
    setLocaleState(nextLocale);
    window.dispatchEvent(new CustomEvent("metria:language-change", { detail: nextLocale }));
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeToHtmlLang[locale];
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const messages = useMemo(() => flattenMessages(dictionaries[locale]), [locale]);
  const fallbackMessages = useMemo(() => flattenMessages(dictionaries[defaultLocale]), []);

  const t = useCallback((key: string, params?: Params) => {
    const normalizedKey = key.replace(":", ".");
    return interpolate(messages[normalizedKey] ?? fallbackMessages[normalizedKey] ?? key, params);
  }, [fallbackMessages, messages]);

  const region = localeLabels[locale].region;

  const plural = useCallback((count: number, oneKey: string, otherKey: string, params?: Params) => {
    const rule = new Intl.PluralRules(region).select(count);
    const key = rule === "one" ? oneKey : otherKey;
    return t(key, { ...params, count });
  }, [region, t]);

  const formatDate = useCallback((value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(region, options ?? { dateStyle: "medium" }).format(new Date(value));
  }, [region]);

  const formatTime = useCallback((value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(region, options ?? { timeStyle: "short" }).format(new Date(value));
  }, [region]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(region, options).format(value);
  }, [region]);

  const formatCurrency = useCallback((value: number, currency = "EUR", options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(region, { style: "currency", currency, ...options }).format(value);
  }, [region]);

  const contextValue = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t,
    plural,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
  }), [formatCurrency, formatDate, formatNumber, formatTime, locale, plural, setLocale, t]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
