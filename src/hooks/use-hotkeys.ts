"use client";

import { useEffect, useCallback, useRef } from "react";

type KeyCombo = string;

type HotkeyHandler = (e: KeyboardEvent) => void;

const SHORTCUTS = new Map<string, HotkeyHandler>();

let isRegistered = false;

function handleGlobalKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  const isInput =
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable;

  const key = buildKeyString(e);

  for (const [combo, handler] of SHORTCUTS) {
    const [triggerKey, ...rest] = combo.split(" ");
    const isGlobalShortcut = rest.length > 0;
    const prefix = isGlobalShortcut ? `${triggerKey} ` : "";

    if (isGlobalShortcut) {
      const subKey = `${triggerKey} ${key}`;
      if (buildKeyString(e) === subKey.split(" ").pop()) {
        if (e.repeat) return;
        e.preventDefault();
        handler(e);
        return;
      }
    }

    if (key === combo) {
      const entry = SHORTCUTS.get(combo);
      if (entry) {
        if (e.repeat) return;
        const isShortcut = !isInput || combo.startsWith("Escape");
        if (!isShortcut) return;
        e.preventDefault();
        entry(e);
        return;
      }
    }
  }
}

function buildKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Mod");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  parts.push(e.key === " " ? "Space" : e.key);
  return parts.join("+");
}

export function registerGlobalShortcut(combo: KeyCombo, handler: HotkeyHandler) {
  SHORTCUTS.set(combo, handler);
  if (!isRegistered) {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleGlobalKeydown);
    }
    isRegistered = true;
  }
}

export function unregisterGlobalShortcut(combo: KeyCombo) {
  SHORTCUTS.delete(combo);
}

export function useHotkeys(
  combo: KeyCombo | KeyCombo[],
  handler: HotkeyHandler,
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stableHandler = useCallback(
    (e: KeyboardEvent) => handlerRef.current(e),
    []
  );

  useEffect(() => {
    const combos = Array.isArray(combo) ? combo : [combo];

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const key = buildKeyString(e);

      for (const comboStr of combos) {
        if (comboStr === key || comboStr.split("|").includes(key)) {
          const skipInput = !comboStr.startsWith("Escape") && !comboStr.startsWith("Enter");
          if (skipInput && isInput) continue;
          if (e.repeat) continue;
          e.preventDefault();
          stableHandler(e);
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo, stableHandler, ...deps]);
}

export function useGlobalHotkey(
  combo: KeyCombo,
  handler: HotkeyHandler,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    registerGlobalShortcut(combo, handler);
    return () => unregisterGlobalShortcut(combo);
  }, [combo, handler, enabled]);
}

export function useKeyboardShortcut(
  combo: string,
  callback: () => void,
  options?: { enabled?: boolean; requireMod?: boolean }
) {
  useEffect(() => {
    if (options?.enabled === false) return;

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const parts = combo.split("+");
      const key = parts[parts.length - 1];
      const mod = parts.includes("Mod");
      const shift = parts.includes("Shift");
      const alt = parts.includes("Alt");

      if (isInput && combo !== "Escape") return;
      if (e.repeat) return;

      const modPressed = e.ctrlKey || e.metaKey;

      if (combo === "Escape") {
        if (e.key === "Escape") {
          e.preventDefault();
          callback();
        }
        return;
      }

      if (e.key.toLowerCase() === key.toLowerCase()) {
        if (mod && !modPressed) return;
        if (shift && !e.shiftKey) return;
        if (alt && !e.altKey) return;
        if (parts.length === 1 && modPressed) return;

        e.preventDefault();
        callback();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [combo, callback, options?.enabled]);
}
