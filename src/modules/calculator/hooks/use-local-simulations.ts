"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "metria_calc_simulations_v1";
const MAX_SIMULATIONS = 30;

export type LocalSimulation = {
  id: string;
  type: string;
  title: string;
  summary: string;
  savedAt: string;
};

export function useLocalSimulations() {
  const [simulations, setSimulations] = useState<LocalSimulation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSimulations(JSON.parse(raw) as LocalSimulation[]);
    } catch {}
  }, []);

  const save = useCallback((input: Omit<LocalSimulation, "id" | "savedAt">): LocalSimulation => {
    const next: LocalSimulation = {
      ...input,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    setSimulations((prev) => {
      const updated = [next, ...prev].slice(0, MAX_SIMULATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    return next;
  }, []);

  const remove = useCallback((id: string) => {
    setSimulations((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { simulations, save, remove };
}
