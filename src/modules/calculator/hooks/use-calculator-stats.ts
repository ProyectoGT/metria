"use client";

import { useCallback, useState } from "react";
import type { CalculatorType } from "../types";

const FAVORITES_KEY = "metria.calculators.favorites";
const RECENT_KEY = "metria.calculators.recent";
const USAGE_KEY = "metria.calculators.usage";
const MAX_RECENT = 6;

function readArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeArray(key: string, data: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function readRecord(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeRecord(key: string, data: Record<string, number>) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function useCalculatorStats() {
  const [favorites, setFavorites] = useState<string[]>(() => readArray(FAVORITES_KEY));
  const [recent, setRecent] = useState<string[]>(() => readArray(RECENT_KEY));
  const [usage, setUsage] = useState<Record<string, number>>(() => readRecord(USAGE_KEY));

  const toggleFavorite = useCallback((id: CalculatorType) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      writeArray(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: CalculatorType) => favorites.includes(id),
    [favorites]
  );

  const trackOpen = useCallback((id: CalculatorType) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((f) => f !== id)].slice(0, MAX_RECENT);
      writeArray(RECENT_KEY, next);
      return next;
    });
    setUsage((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      writeRecord(USAGE_KEY, next);
      return next;
    });
  }, []);

  const getUsageCount = useCallback(
    (id: CalculatorType) => usage[id] ?? 0,
    [usage]
  );

  return { favorites, recent, usage, toggleFavorite, isFavorite, trackOpen, getUsageCount };
}
