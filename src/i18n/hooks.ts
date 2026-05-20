"use client";

import { createContext, useContext } from "react";
import type { I18nContextValue } from "./context";

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}

/** Backwards-compatible alias — prefer useTranslation() in new code. */
export const useI18n = useTranslation;
