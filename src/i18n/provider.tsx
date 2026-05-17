"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLocale, localeConfig, type Locale } from "./config";
import type { I18nContextValue } from "./context";
import { I18nContext } from "./hooks";
import { flattenMessages, getStoredLocale, interpolate, storeLocale } from "./utils";

import esMessages from "@/locales/es.json";
import itMessages from "@/locales/it.json";

type Params = Record<string, string | number | Date | null | undefined>;
type FlatMessages = Record<string, string>;

const ALL_MESSAGES: Record<Locale, FlatMessages> = {
  es: flattenMessages(esMessages as Record<string, unknown> as Record<string, string>),
  it: flattenMessages(itMessages as Record<string, unknown> as Record<string, string>),
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Restore persisted locale after hydration to avoid SSR mismatch
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored !== defaultLocale) setLocaleState(stored);
  }, []);

  // Keep html lang attribute in sync
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    storeLocale(next);
    setLocaleState(next);
  }, []);

  const messages = ALL_MESSAGES[locale];
  const fallback = ALL_MESSAGES[defaultLocale];

  const t = useCallback(
    (key: string, params?: Params): string => {
      const k = key.replace(":", ".");
      const raw = messages[k] ?? fallback[k] ?? k;
      return interpolate(raw, params as Record<string, string | number | Date | null | undefined>);
    },
    [messages, fallback],
  );

  const region = localeConfig[locale].region;

  const plural = useCallback(
    (count: number, oneKey: string, otherKey: string, params?: Params) => {
      const rule = new Intl.PluralRules(region).select(count);
      return t(rule === "one" ? oneKey : otherKey, { ...params, count });
    },
    [region, t],
  );

  const formatDate = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(region, options ?? { dateStyle: "medium" }).format(new Date(value)),
    [region],
  );

  const formatTime = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(region, options ?? { timeStyle: "short" }).format(new Date(value)),
    [region],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(region, options).format(value),
    [region],
  );

  const formatCurrency = useCallback(
    (value: number, currency = "EUR", options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(region, { style: "currency", currency, ...options }).format(value),
    [region],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, plural, formatDate, formatTime, formatNumber, formatCurrency }),
    [locale, setLocale, t, plural, formatDate, formatTime, formatNumber, formatCurrency],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
