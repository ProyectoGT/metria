"use client";

import { useEffect } from "react";

export default function ThemeScript() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("metria-theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return null;
}
