"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useHotkeys } from "@/hooks/use-hotkeys";
import ShortcutsDialog from "./shortcuts-dialog";

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const openSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>(
      'header input[type="text"]'
    );
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }, []);

  const openNewTask = useCallback(() => {
    const addButtons = document.querySelectorAll<HTMLButtonElement>(
      'button:has([class*="Plus"])'
    );
    if (addButtons.length > 0) {
      addButtons[0]?.click();
    }
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      if (pathname !== path) {
        router.push(path);
      }
    },
    [router, pathname]
  );

  useHotkeys("/", openSearch, [openSearch]);

  useHotkeys("N", openNewTask, [openNewTask]);

  useHotkeys(
    ["Shift+?"],
    (e: KeyboardEvent) => {
      e.preventDefault();
      setHelpOpen(true);
    },
    []
  );

  useHotkeys("Escape", () => setHelpOpen(false), []);

  useHotkeys(
    "g",
    () => {
      setPendingG(true);
      const timeout = setTimeout(() => setPendingG(false), 800);
      return () => clearTimeout(timeout);
    },
    []
  );

  useHotkeys(
    "d",
    () => {
      if (pendingG) {
        setPendingG(false);
        navigateTo("/dashboard");
      }
    },
    [pendingG, navigateTo]
  );

  useHotkeys(
    "c",
    () => {
      if (pendingG) {
        setPendingG(false);
        navigateTo("/calendario");
      }
    },
    [pendingG, navigateTo]
  );

  useHotkeys(
    "o",
    () => {
      if (pendingG) {
        setPendingG(false);
        navigateTo("/ordenes");
      }
    },
    [pendingG, navigateTo]
  );

  useHotkeys(
    "u",
    () => {
      if (pendingG) {
        setPendingG(false);
        navigateTo("/usuarios");
      }
    },
    [pendingG, navigateTo]
  );

  useHotkeys(
    "p",
    () => {
      if (pendingG) {
        setPendingG(false);
        navigateTo("/propiedades");
      }
    },
    [pendingG, navigateTo]
  );

  return <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />;
}
