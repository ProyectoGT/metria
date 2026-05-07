"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Bell, ChevronDown, Menu, X, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import Avatar from "@/components/ui/avatar";
import type { NotificationItem } from "./app-shell";
import type { SearchResult } from "@/app/api/search/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prioridadColor(p: string | null) {
  if (p === "alta") return "text-danger";
  if (p === "media") return "text-accent";
  return "text-primary";
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "";
  return new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  zona: "Zona", sector: "Sector", finca: "Finca",
  propiedad: "Propiedad", solicitud: "Solicitud",
  usuario: "Usuario", ticket: "Soporte", tarea: "Tarea", contacto: "Contacto", email: "Email",
};

const TYPE_COLORS: Record<SearchResult["type"], string> = {
  zona:      "bg-primary/10    text-primary",
  sector:    "bg-primary/15    text-primary",
  finca:     "bg-accent/10     text-accent",
  propiedad: "bg-success/10    text-success",
  solicitud: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  usuario:   "bg-blue-500/10   text-blue-600   dark:text-blue-400",
  ticket:    "bg-danger/10     text-danger",
  tarea:     "bg-secondary/10  text-secondary",
  contacto:  "bg-teal-500/10   text-teal-600   dark:text-teal-400",
  email:     "bg-sky-500/10    text-sky-600    dark:text-sky-400",
};

function getPlaceholder(pathname: string): string {
  if (pathname.startsWith("/zona"))        return "Buscar zonas, sectores, fincas…";
  if (pathname.startsWith("/solicitudes")) return "Buscar solicitudes…";
  if (pathname.startsWith("/usuarios"))    return "Buscar usuarios…";
  if (pathname.startsWith("/soporte"))     return "Buscar tickets…";
  if (pathname.startsWith("/contactos"))   return "Buscar contactos…";
  return "Buscar en todo el programa…";
}

function getCtx(pathname: string): string {
  if (pathname.startsWith("/zona"))        return "zona";
  if (pathname.startsWith("/solicitudes")) return "solicitudes";
  if (pathname.startsWith("/usuarios"))    return "usuarios";
  if (pathname.startsWith("/soporte"))     return "soporte";
  if (pathname.startsWith("/contactos"))   return "contactos";
  if (pathname.startsWith("/email"))       return "general";
  return "general";
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface HeaderProps {
  userName: string;
  userEmail?: string | null;
  avatarUrl?: string | null;
  notifications?: NotificationItem[];
}

export default function Header({ userName, userEmail, avatarUrl, notifications = [] }: HeaderProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const placeholder = getPlaceholder(pathname);
  const ctx         = getCtx(pathname);

  // ── State ──────────────────────────────────────────────────────────────────
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [bellOpen,       setBellOpen]       = useState(false);
  const [searchValue,    setSearchValue]    = useState("");
  const [searchResults,  setSearchResults]  = useState<SearchResult[]>([]);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchLoading,  setSearchLoading]  = useState(false);

  const menuRef   = useRef<HTMLDivElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset search on page navigation
  useEffect(() => {
    setSearchValue("");
    setSearchResults([]);
    setSearchOpen(false);
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current   && !menuRef.current.contains(e.target as Node))   setMenuOpen(false);
      if (bellRef.current   && !bellRef.current.contains(e.target as Node))   setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (debounce.current) clearTimeout(debounce.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}&ctx=${ctx}`);
        const json = await res.json();
        setSearchResults(json.results ?? []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [ctx]);

  function clearSearch() {
    setSearchValue("");
    setSearchResults([]);
    setSearchOpen(false);
  }

  function handleResultClick(href: string) {
    clearSearch();
    router.push(href);
  }

  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-[20] flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-surface/95 px-4 backdrop-blur-sm md:px-5">

      {/* ── Hamburger (solo móvil) ─────────────────────────────────── */}
      <button
        onClick={() => window.dispatchEvent(new Event("sidebar:toggle"))}
        className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div ref={searchRef} className="relative min-w-0 flex-1 md:max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary/70 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") clearSearch(); }}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            placeholder={placeholder}
            className="h-9 w-full rounded-xl border-0 bg-surface-raised pl-9 pr-8 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none ring-0 transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
          />
          {searchValue && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 rounded-md p-0.5 text-text-secondary hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Resultados de búsqueda */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-full mt-1.5 w-full min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:min-w-[340px]"
            >
              {searchLoading ? (
                <p className="px-4 py-3 text-sm text-text-secondary">Buscando…</p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-text-secondary">
                  Sin resultados para &ldquo;{searchValue}&rdquo;
                </p>
              ) : (
                <ul className="max-h-72 divide-y divide-border overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <motion.li
                      key={r.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.15 }}
                    >
                      <button
                        onClick={() => handleResultClick(r.href)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-raised"
                      >
                        <span className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[r.type]}`}>
                          {TYPE_LABELS[r.type]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {r.label}
                          </span>
                          {r.sublabel && (
                            <span className="block truncate text-xs text-text-secondary">{r.sublabel}</span>
                          )}
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Spacer ────────────────────────────────────────────────── */}
      <div className="hidden flex-1 md:block" />

      {/* ── Right actions ─────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1">

        {/* Notificaciones */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((p) => !p)}
            className="relative rounded-xl p-2 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            aria-label="Notificaciones"
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
              className="fixed left-4 right-4 top-16 z-[50] overflow-hidden rounded-xl border border-border bg-surface shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-80"
            >
              {/* Header del panel */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm font-semibold text-text-primary">Tareas pendientes</span>
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
                  <p className="text-sm font-medium text-text-secondary">Sin tareas pendientes</p>
                </div>
              ) : (
                <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-raised">
                      <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${prioridadColor(n.prioridad)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{n.titulo}</p>
                        {n.fecha && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                            <Calendar className="h-3 w-3" />
                            {formatFecha(n.fecha)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-border px-4 py-2.5">
                <Link
                  href="/ordenes"
                  onClick={() => setBellOpen(false)}
                  className="block text-center text-xs font-medium text-primary transition-colors hover:underline"
                >
                  Ver todas las tareas →
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
            className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-surface-raised"
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
              className="absolute right-0 top-full mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg"
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
              {/* Acciones */}
              <div className="py-1">
                <Link
                  href="/cuenta"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-raised"
                >
                  Mi perfil
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-danger transition-colors hover:bg-surface-raised"
                  >
                    Cerrar sesión
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
