"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import { Search, Bell, ChevronDown, Menu, Calendar, AlertCircle, CheckCircle2, LifeBuoy, Languages, Check, Command } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import Avatar from "@/components/ui/avatar";
import { useTheme, THEMES } from "@/lib/theme-context";
import { PRIORITY_TONE, normalizePriority } from "@/lib/design-system";
import { localeLabels, useI18n, type Locale } from "@/lib/i18n";
import type { NotificationItem } from "./app-shell";
import SpotlightSearch from "@/components/ui/spotlight-search";
import { useSetSpotlightOpen, useSpotlightOpen } from "@/hooks/use-ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prioridadColor(p: string | null) {
  return PRIORITY_TONE[normalizePriority(p)].text;
}

function formatFecha(fecha: string | null, locale = "es-ES"): string {
  if (!fecha) return "";
  return new Date(fecha).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

const LANGUAGE_OPTIONS: Array<{ label: string; value: Locale; flag: string }> = [
  { label: "Español",  value: "es", flag: "🇪🇸" },
  { label: "Català",   value: "ca", flag: "🏴" },
  { label: "English",  value: "en", flag: "🇬🇧" },
  { label: "Italiano", value: "it", flag: "🇮🇹" },
];

// ─── Componente ───────────────────────────────────────────────────────────────

interface HeaderProps {
  userName: string;
  userEmail?: string | null;
  avatarUrl?: string | null;
  notifications?: NotificationItem[];
}

export default function Header({ userName, userEmail, avatarUrl, notifications = [] }: HeaderProps) {
  const { locale, setLocale, t } = useI18n();

  // ── Theme ──────────────────────────────────────────────────────────────────
  const { theme, applyTheme } = useTheme();

  // ── State ──────────────────────────────────────────────────────────────────
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [bellOpen,       setBellOpen]       = useState(false);
  const spotlightOpen = useSpotlightOpen();
  const setSpotlightOpen = useSetSpotlightOpen();

  const menuRef   = useRef<HTMLDivElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click; open spotlight on "/"
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current   && !menuRef.current.contains(e.target as Node))   setMenuOpen(false);
      if (bellRef.current   && !bellRef.current.contains(e.target as Node))   setBellOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setBellOpen(false);
      }
      // "/" to open spotlight (only when not typing in an input)
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target as HTMLElement).isContentEditable) {
          e.preventDefault();
          setSpotlightOpen(true);
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [setSpotlightOpen]);

  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-[20] flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface-elevated px-4 shadow-layer-1 md:px-5">

      {/* ── Hamburger (solo móvil) ─────────────────────────────────── */}
      <button
        onClick={() => window.dispatchEvent(new Event("sidebar:toggle"))}
        className="touch-target rounded-lg p-2.5 text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary md:hidden md:p-2"
        aria-label={t("navigation.openMenu")}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Spotlight search trigger ──────────────────────────────── */}
      <button
        onClick={() => setSpotlightOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2 text-left text-sm text-text-secondary/60 transition-all hover:border-border-strong hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus md:max-w-md"
      >
        <Search className="h-4 w-4 shrink-0 text-text-secondary/50" />
        <span className="min-w-0 flex-1 truncate">{t("search.global")}</span>
        <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-text-secondary/50 sm:inline-flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Spotlight modal */}
      <SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />

      {/* ── Spacer ────────────────────────────────────────────────── */}
      <div className="hidden flex-1 md:block" />

      {/* ── Right actions ─────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1">

        {/* Notificaciones */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((p) => !p)}
            className="touch-target relative rounded-xl p-2.5 text-text-secondary transition-colors hover:bg-state-hover hover:text-text-primary md:p-2"
            aria-label={t("common.notifications")}
            aria-expanded={bellOpen}
            aria-haspopup="true"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold leading-none text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {bellOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-4 right-4 top-16 z-[50] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-layer-3 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-80"
            >
              {/* Header del panel */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm font-semibold text-text-primary">{t("common.notifications")}</span>
                </div>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                    {unreadCount}
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success/60" />
                  <p className="text-sm font-medium text-text-secondary">{t("common.noPendingNotifications")}</p>
                </div>
              ) : (
                <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                  {notifications.map((n) => {
                    const isSoporte = n.type === "soporte";
                    const item = isSoporte ? (
                      <Link
                        href={n.href ?? "/soporte"}
                        onClick={() => setBellOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-state-hover"
                      >
                        <LifeBuoy className={`mt-0.5 h-4 w-4 shrink-0 text-primary`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{n.titulo}</p>
                          {n.fecha && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                              <Calendar className="h-3 w-3" />
                              {formatFecha(n.fecha, localeLabels[locale].region)}
                            </p>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-state-hover">
                        <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${prioridadColor(n.prioridad)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{n.titulo}</p>
                          {n.fecha && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                              <Calendar className="h-3 w-3" />
                              {formatFecha(n.fecha, localeLabels[locale].region)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                    return <li key={`${n.type}-${n.id}`}>{item}</li>;
                  })}
                </ul>
              )}

              <div className="flex items-center justify-center gap-4 border-t border-border px-4 py-2.5">
                <Link
                  href="/ordenes"
                  onClick={() => setBellOpen(false)}
                  className="text-center text-xs font-medium text-primary transition-colors hover:underline"
                >
                  {t("common.tasks")}
                </Link>
                <span className="text-text-secondary/40">|</span>
                <Link
                  href="/soporte"
                  onClick={() => setBellOpen(false)}
                  className="text-center text-xs font-medium text-primary transition-colors hover:underline"
                >
                  {t("common.support")}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Separador */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="touch-target flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-state-hover md:py-1.5"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label={t("common.userMenu") || `Menú de ${userName}`}
          >
            <Avatar name={userName} src={avatarUrl ?? undefined} size="sm" />
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-text-primary sm:block">
              {userName.split(" ")[0]}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-text-secondary transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-surface-elevated py-1 shadow-layer-2"
            >
              {/* Info de cuenta */}
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-text-primary">{userName}</p>
                {userEmail && (
                  <p className="mt-0.5 truncate text-xs text-text-secondary" title={userEmail}>
                    {userEmail}
                  </p>
                )}
              </div>
              {/* Selector de tema */}
              <div className="border-b border-border px-4 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50">
                  {t("common.appearance")}
                </p>
                <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                  {THEMES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => applyTheme(value)}
                      className={[
                        "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-all duration-150",
                        theme === value
                          ? "bg-surface text-primary shadow-layer-1"
                          : "text-text-secondary hover:text-text-primary",
                      ].join(" ")}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t(value === "light" ? "theme.light" : value === "dark" ? "theme.dark" : "theme.black") || label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-b border-border px-4 py-2">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50">
                  <Languages className="h-3 w-3" />
                  {t("common.language")}
                </p>
                <div className="space-y-0.5">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLocale(option.value)}
                      className={[
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                        locale === option.value
                          ? "bg-primary/10 text-primary"
                          : "text-text-secondary hover:bg-state-hover hover:text-text-primary",
                      ].join(" ")}
                      aria-label={`${t("common.language")}: ${option.label}`}
                    >
                      <span className="flex items-center gap-2"><span aria-hidden="true">{option.flag}</span>{option.label}</span>
                      {locale === option.value && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </div>
              {/* Acciones */}
              <div className="py-1">
                <Link
                  href="/cuenta"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-state-hover"
                >
                  {t("common.profile")}
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-danger transition-colors hover:bg-state-hover"
                  >
                    {t("common.signOut")}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
