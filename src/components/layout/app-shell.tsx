"use client";

import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Topnav from "./topnav";

export type Theme  = "light" | "dark";
export type Layout = "sidebar" | "topnav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [theme,   setTheme]   = useState<Theme>("light");
  const [layout,  setLayout]  = useState<Layout>("sidebar");
  const [mounted, setMounted] = useState(false);

  // Read saved preferences on mount
  useEffect(() => {
    const savedTheme  = (localStorage.getItem("metria-theme")  as Theme)  || "light";
    const savedLayout = (localStorage.getItem("metria-layout") as Layout) || "sidebar";
    setTheme(savedTheme);
    setLayout(savedLayout);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("metria-theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function toggleLayout() {
    const next = layout === "sidebar" ? "topnav" : "sidebar";
    setLayout(next);
    localStorage.setItem("metria-layout", next);
  }

  // Before mount: render the default shell (avoids hydration mismatch)
  if (!mounted) {
    return (
      <div className="flex h-full">
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar" />
        <main className="ml-64 flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    );
  }

  if (layout === "topnav") {
    return (
      <div className="flex h-full flex-col">
        <Topnav
          theme={theme}
          layout={layout}
          onToggleTheme={toggleTheme}
          onToggleLayout={toggleLayout}
        />
        <main className="flex-1 overflow-y-auto p-8 pt-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar
        theme={theme}
        layout={layout}
        onToggleTheme={toggleTheme}
        onToggleLayout={toggleLayout}
      />
      <main className="ml-64 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
