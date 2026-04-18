"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Bell, ChevronDown, Menu, X, Calendar, AlertCircle } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import Avatar from "@/components/ui/avatar";
import type { NotificationItem } from "./app-shell";
import type { SearchResult } from "@/app/api/search/route";

// ── Helpers ──────────────────────────────────────────────────────

function prioridadColor(p: string | null) {
  if (p === "alta") return "text-red-500";
  if (p === "media") return "text-amber-500";
  return "text-blue-500";
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  zona: "Zona",
  sector: "Sector",
  finca: "Finca",
  propiedad: "Propiedad",
  solicitud: "Solicitud",
  usuario: "Usuario",
  ticket: "Soporte",
  tarea: "Tarea",
};

const TYPE_COLORS: Record<SearchResult["type"], string> = {
  zona: "bg-primary/10 text-primary",
  sector: "bg-primary/15 text-primary",
  finca: "bg-accent/10 text-accent",
  propiedad: "bg-success/10 text-success",
  solicitud: "bg-purple-500/10 text-purple-500",
  usuario: "bg-blue-500/10 text-blue-500",
  ticket: "bg-danger/10 text-danger",
  tarea: "bg-secondary/10 text-secondary",
};

function getContext(pathname: string): { ctx: string; placeholder: string } {
  if (pathname.startsWith("/zona")) return { ctx: "zona", placeholder: "Buscar zonas, sectores, fincas, propietarios…" };
  if (pathname.startsWith("/solicitudes")) return { ctx: "solicitudes", placeholder: "Buscar solicitudes…" };
  if (pathname.startsWith("/usuarios")) return { ctx: "usuarios", placeholder: "Buscar por nombre, correo o rango…" };
  if (pathname.startsWith("/soporte")) return { ctx: "soporte", placeholder: "Buscar tickets de soporte…" };
  return { ctx: "general", placeholder: "Buscar en todo el programa…" };
}

// ── Component ────────────────────────────────────────────────────

interface HeaderProps {
  userName: string;
  userEmail?: string | null;
  avatarUrl?: string | null;
  notifications?: NotificationItem[];
}

export default function Header({ userName, userEmail, avatarUrl, notifications = [] }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { ctx, placeholder } = getContext(pathname);

  // User menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Bell panel
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Search
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset search on page change
  useEffect(() => {
    setSearchValue("");
    setSearchResults([]);
    setSearchOpen(false);
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}&ctx=${ctx}`);
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

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchValue("");
    }
  }

  function handleResultClick(href: string) {
    setSearchOpen(false);
    setSearchValue("");
    router.push(href);
  }

  function clearSearch() {
    setSearchValue("");
    setSearchResults([]);
    setSearchOpen(false);
  }

  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b border-border bg-surface px-4 md:px-6">
      {/* Botón hamburger — solo en móvil */}
      <button
        onClick={() => window.dispatchEvent(new Event("sidebar:toggle"))}
        className="mr-3 rounded-lg p-2 text-text-secondary hover:bg-background hover:text-text-primary md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar */}
      <div ref={searchRef} className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
          placeholder={placeholder}
          className="input py-2 pl-10 pr-8"
        />
        {searchValue && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-secondary hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Results dropdown */}
        {searchOpen && (
          <div className="absolute left-0 top-full mt-1 w-full min-w-[360px] rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
            {searchLoading ? (
              <p className="px-4 py-3 text-sm text-text-secondary">Buscando…</p>
            ) : searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-secondary">
                Sin resultados para &ldquo;{searchValue}&rdquo;
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-border">
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => handleResultClick(r.href)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-background"
                    >
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[r.type]}`}
                      >
                        {TYPE_LABELS[r.type]}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-text-primary">
                          {r.label}
                        </span>
                        {r.sublabel && (
                          <span className="block truncate text-xs text-text-secondary">
                            {r.sublabel}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications bell */}
      <div ref={bellRef} className="relative mr-4">
        <button
          onClick={() => setBellOpen((prev) => !prev)}
          className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] max-w-80 rounded-xl border border-border bg-surface shadow-lg z-50 sm:w-80">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Tareas pendientes</p>
              {unreadCount > 0 && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                  {unreadCount}
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-secondary">
                Sin tareas pendientes
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-background transition-colors">
                    <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${prioridadColor(n.prioridad)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{n.titulo}</p>
                      {n.fecha && (
                        <p className="flex items-center gap-1 mt-0.5 text-xs text-text-secondary">
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
                className="block text-center text-xs font-medium text-primary hover:underline"
              >
                Ver todas las tareas →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-background"
        >
          <Avatar name={userName} src={avatarUrl ?? undefined} size="md" />
          <span className="hidden text-sm font-medium text-text-primary sm:block">
            {userName}
          </span>
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-surface py-1 shadow-lg">
            {userEmail && (
              <div className="overflow-hidden border-b border-border px-4 py-2">
                <p className="truncate text-xs text-text-secondary" title={userEmail}>
                  {userEmail}
                </p>
              </div>
            )}
            <Link
              href="/cuenta"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm text-text-primary transition-colors hover:bg-background"
            >
              Mi perfil
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center px-4 py-2 text-sm text-danger transition-colors hover:bg-background"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
