"use client";

import { useEffect, useRef, useCallback } from "react";
import { logout } from "@/app/(auth)/actions";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const MOBILE_SESSION_QUERY = "(max-width: 767px), (pointer: coarse)";
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export default function InactivityGuard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    if (window.matchMedia(MOBILE_SESSION_QUERY).matches) {
      return;
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [resetTimer]);

  return null;
}
