import type { Locale } from "./config";

type Params = Record<string, string | number | Date | null | undefined>;

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
  plural: (count: number, oneKey: string, otherKey: string, params?: Params) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
};
