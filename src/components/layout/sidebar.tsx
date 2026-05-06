"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { canManageUsers, canViewOrgChart, normalizeUserRole } from "@/lib/roles";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  TrendingUp,
  Calendar,
  Calculator,
  FileText,
  LifeBuoy,
  Moon,
  Network,
  Sun,
  Circle,
  Users,
  BookUser,
  Building2,
  Mail,
  X,
} from "lucide-react";

type Theme = "light" | "dark" | "dark-black";

const THEMES: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light",      label: "Claro",  icon: Sun },
  { value: "dark",       label: "Oscuro", icon: Moon },
  { value: "dark-black", label: "Negro",  icon: Circle },
];

// ─── Grupos de navegación ─────────────────────────────────────────────────────

const MAIN_NAV = [
  { label: "Dashboard",      href: "/dashboard",    icon: LayoutDashboard },
  { label: "Zona",           href: "/zona",          icon: MapPin },
  { label: "Propiedades",    href: "/propiedades",   icon: Building2 },
  { label: "Solicitudes",    href: "/solicitudes",   icon: ClipboardList },
  { label: "Contactos",      href: "/contactos",     icon: BookUser },
  { label: "Email",          href: "/email",          icon: Mail },
];

const TOOLS_NAV = [
  { label: "Desarrollo",      href: "/desarrollo",  icon: TrendingUp },
  { label: "Calendario",      href: "/calendario",  icon: Calendar },
  { label: "Ordenes del dia", href: "/ordenes",     icon: FileText },
  { label: "Calculadora",     href: "/calculadora", icon: Calculator },
];

// ─── Estilos compartidos de item ──────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/10 text-primary"
          : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-primary" : "text-text-secondary group-hover:text-text-primary",
        ].join(" ")}
      />
      <span className="truncate">{label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </Link>
  );
}

function NavGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="mb-1.5 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface Props {
  userRole?: string | null;
}

export default function Sidebar({ userRole: _userRole }: Props) {
  const pathname = usePathname();

  const [theme, setTheme] = useState<Theme>("dark");
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = _userRole ? normalizeUserRole(_userRole) : null;
  const canSeeUsers = canManageUsers(userRole ?? "Agente");
  const canSeeOrganigrama = canViewOrgChart(userRole ?? "Agente");

  const applyTheme = useCallback((t: Theme, persist = true) => {
    const el = document.documentElement;
    el.classList.remove("dark", "dark-black");
    if (t === "dark")       el.classList.add("dark");
    if (t === "dark-black") el.classList.add("dark", "dark-black");
    localStorage.setItem("metria-theme", t);
    setTheme(t);
    if (persist) {
      fetch("/api/user/preferences/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: t }),
      }).catch(() => {});
    }
  }, []);

  // Sincronizar estado del botón de tema desde localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem("metria-theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  // Escuchar evento del botón hamburger del header
  useEffect(() => {
    function handleToggle() { setMobileOpen((prev) => !prev); }
    window.addEventListener("sidebar:toggle", handleToggle);
    return () => window.removeEventListener("sidebar:toggle", handleToggle);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/user/preferences/theme")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (active && json?.theme) applyTheme(json.theme as Theme, false);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [applyTheme]);

  // Cerrar al navegar
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMobileOpen(false));
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const navContent = (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-border/60 bg-sidebar-logo px-4">
        <Image
          src="/logo-bg-master-iberica.png"
          alt="Master Ibérica"
          width={190}
          height={48}
          className="max-h-10 w-auto object-contain"
          priority
        />
        {/* Cerrar — solo en móvil */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navegación ───────────────────────────────────────────── */}
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">

        <NavGroup>
          {MAIN_NAV.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </NavGroup>

        <NavGroup label="Herramientas">
          {TOOLS_NAV.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </NavGroup>

        {(canSeeUsers || canSeeOrganigrama) && (
          <NavGroup label="Gestión">
            {canSeeUsers && (
              <NavItem href="/usuarios" icon={Users} label="Usuarios" active={isActive("/usuarios")} />
            )}
            {canSeeOrganigrama && (
              <NavItem href="/empresa/organigrama" icon={Network} label="Organigrama" active={isActive("/empresa/organigrama")} />
            )}
          </NavGroup>
        )}

        {/* Separador + Soporte */}
        <div className="mt-3 border-t border-border/60 pt-3">
          <NavItem href="/soporte" icon={LifeBuoy} label="Soporte" active={isActive("/soporte")} />
        </div>
      </nav>

      {/* ── Footer: selector de tema ─────────────────────────────── */}
      <div className="shrink-0 border-t border-border/60 px-3 py-3">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50">
          Tema
        </p>
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => applyTheme(value)}
              title={label}
              className={[
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-all duration-150",
                theme === value
                  ? "bg-surface text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] text-text-secondary/40">v1.0</p>
      </div>
    </div>
  );

  const sidebarClass = "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sidebar";
  const borderClass  = "border-r border-border";

  return (
    <>
      {/* ── Desktop ───────────────────────────────────────────────── */}
      <aside className={`${sidebarClass} ${borderClass} hidden md:flex`}>
        {navContent}
      </aside>

      {/* ── Móvil: overlay con blur ───────────────────────────────── */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={[
          `${sidebarClass} ${borderClass} transition-transform duration-300 ease-out md:hidden`,
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        ].join(" ")}
      >
        {navContent}
      </aside>
    </>
  );
}
