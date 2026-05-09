"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type ElementType } from "react";
import { Sun, Moon, Circle } from "lucide-react";

export type Theme = "light" | "dark" | "dark-black";

export const THEMES: { value: Theme; label: string; icon: ElementType }[] = [
  { value: "light",      label: "Claro",  icon: Sun },
  { value: "dark",       label: "Oscuro", icon: Moon },
  { value: "dark-black", label: "Negro",  icon: Circle },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  applyTheme: (t: Theme, persist?: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  const applyTheme = useCallback((t: Theme, persist = true) => {
    const el = document.documentElement;
    el.classList.remove("dark", "dark-black");
    if (t === "dark")       el.classList.add("dark");
    if (t === "dark-black") el.classList.add("dark", "dark-black");
    localStorage.setItem("metria-theme", t);
    setThemeState(t);
    if (persist) {
      fetch("/api/user/preferences/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: t }),
      }).catch(() => {});
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
  }, [applyTheme]);

  useEffect(() => {
    const saved = localStorage.getItem("metria-theme") as Theme | null;
    if (saved) {
      window.setTimeout(() => applyTheme(saved, false), 0);
      return;
    }

    let active = true;
    fetch("/api/user/preferences/theme")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (active && json?.theme) applyTheme(json.theme as Theme, false);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
