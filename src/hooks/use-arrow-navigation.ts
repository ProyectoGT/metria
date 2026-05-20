"use client";

import { useCallback, useEffect, useRef } from "react";

interface ArrowNavOptions {
  enabled?: boolean;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  orientation?: "vertical" | "horizontal";
  loop?: boolean;
}

export function useArrowNavigation<T extends HTMLElement>(
  itemCount: number,
  options: ArrowNavOptions = {}
) {
  const {
    enabled = true,
    onSelect,
    onEscape,
    orientation = "vertical",
    loop = true,
  } = options;

  const containerRef = useRef<T>(null);
  const selectedIndexRef = useRef(-1);

  const resetSelection = useCallback(() => {
    selectedIndexRef.current = -1;
  }, []);

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    function getItems(): HTMLElement[] {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          '[role="menuitem"], [role="option"], [data-nav-item]'
        )
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      const items = getItems();
      if (items.length === 0) return;

      const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
      const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
      const currentIndex = selectedIndexRef.current;

      if (e.key === prevKey) {
        e.preventDefault();
        const next = currentIndex <= 0 ? (loop ? items.length - 1 : 0) : currentIndex - 1;
        selectedIndexRef.current = next;
        items[next]?.focus();
      } else if (e.key === nextKey) {
        e.preventDefault();
        const next = currentIndex >= items.length - 1 ? (loop ? 0 : items.length - 1) : currentIndex + 1;
        selectedIndexRef.current = next;
        items[next]?.focus();
      } else if (e.key === "Enter" || e.key === " ") {
        if (currentIndex >= 0 && currentIndex < items.length) {
          e.preventDefault();
          items[currentIndex]?.click();
          onSelect?.(currentIndex);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
      } else if (e.key === "Home") {
        e.preventDefault();
        selectedIndexRef.current = 0;
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        selectedIndexRef.current = items.length - 1;
        items[items.length - 1]?.focus();
      }
    }

    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemCount, orientation, loop, onSelect, onEscape]);

  return { containerRef, resetSelection };
}
