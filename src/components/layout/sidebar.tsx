"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { canManageUsers, canViewOrgChart, normalizeUserRole } from "@/lib/roles";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  TrendingUp,
  Calendar,
  Calculator,
  FileText,
  LifeBuoy,
  Network,
  Sun,
  Users,
  BookUser,
  Building2,
  Mail,
  Settings,
  X,
} from "lucide-react";

// ─── Grupos de navegación ─────────────────────────────────────────────────────

const MAIN_NAV = [
  { labelKey: "navigation.today",      href: "/hoy",           resourceKey: "dashboard",    icon: Sun },
  { labelKey: "navigation.dashboard",  href: "/dashboard",     resourceKey: "dashboard",    icon: LayoutDashboard },
  { labelKey: "navigation.zone",       href: "/zona",          resourceKey: "zona",         icon: MapPin },
  { labelKey: "navigation.mapZones",   href: "/zonas-geograficas", resourceKey: "zonas-geograficas", icon: MapPin },
  { labelKey: "navigation.properties", href: "/propiedades",   resourceKey: "propiedades",  icon: Building2 },
  { labelKey: "navigation.requests",   href: "/solicitudes",   resourceKey: "solicitudes",  icon: ClipboardList },
  { labelKey: "navigation.contacts",   href: "/contactos",     resourceKey: "contactos",    icon: BookUser },
  { labelKey: "navigation.email",      href: "/email",         resourceKey: "email",        icon: Mail },
];

const TOOLS_NAV = [
  { labelKey: "navigation.development", href: "/desarrollo",  resourceKey: "desarrollo",  icon: TrendingUp },
  { labelKey: "navigation.calendar",    href: "/calendario",  resourceKey: "calendario",  icon: Calendar },
  { labelKey: "navigation.dayOrders",   href: "/ordenes",     resourceKey: "ordenes",     icon: FileText },
  { labelKey: "navigation.calculator",  href: "/calculadora", resourceKey: "calculadora", icon: Calculator },
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
    <motion.div variants={staggerItem}>
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
          <motion.span
            layoutId="sidebar-active"
            className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </Link>
    </motion.div>
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
  deniedResourceKeys?: string[];
}

export default function Sidebar({ userRole: _userRole, deniedResourceKeys = [] }: Props) {
  const pathname = usePathname();
  const { t } = useI18n();

  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = _userRole ? normalizeUserRole(_userRole) : null;
  const role = userRole ?? "Agente";
  const canSeeUsers = canManageUsers(role);
  const canSeeOrganigrama = canViewOrgChart(role);
  const isAdmin = role === "Administrador";
  const deniedSet = new Set(deniedResourceKeys);

  function isNavVisible(key: string): boolean {
    return !deniedSet.has(key);
  }

  useEffect(() => {
    function handleToggle() { setMobileOpen((prev) => !prev); }
    window.addEventListener("sidebar:toggle", handleToggle);
    return () => window.removeEventListener("sidebar:toggle", handleToggle);
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMobileOpen(false));
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/zona") {
      return pathname === "/zona" || pathname.startsWith("/zona/");
    }
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
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label={t("navigation.closeMenu")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navegación ───────────────────────────────────────────── */}
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">

        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          <NavGroup>
            {MAIN_NAV.filter((item) => isNavVisible(item.resourceKey)).map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={t(item.labelKey)} active={isActive(item.href)} />
            ))}
          </NavGroup>
        </motion.div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          <NavGroup label={t("navigation.tools")}>
            {TOOLS_NAV.filter((item) => isNavVisible(item.resourceKey)).map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={t(item.labelKey)} active={isActive(item.href)} />
            ))}
          </NavGroup>
        </motion.div>

        {/* Gestión: base permission + configurable layer */}
        {(canSeeUsers || canSeeOrganigrama) && (
          <NavGroup label={t("navigation.management")}>
            {canSeeUsers && isNavVisible("usuarios") && (
              <NavItem href="/usuarios" icon={Users} label={t("navigation.users")} active={isActive("/usuarios")} />
            )}
            {canSeeOrganigrama && isNavVisible("organigrama") && (
              <NavItem href="/empresa/organigrama" icon={Network} label={t("navigation.orgChart")} active={isActive("/empresa/organigrama")} />
            )}
          </NavGroup>
        )}

        {/* Soporte + Configuración */}
        <div className="mt-3 border-t border-border/60 pt-3">
          {isNavVisible("soporte") && (
            <NavItem href="/soporte" icon={LifeBuoy} label={t("navigation.support")} active={isActive("/soporte")} />
          )}
          {isAdmin && isNavVisible("configuracion") && (
            <NavItem href="/configuracion/control-acceso" icon={Settings} label={t("navigation.accessControl")} active={isActive("/configuracion/control-acceso")} />
          )}
        </div>
      </nav>

    </div>
  );

  const sidebarClass = "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sidebar";
  const borderClass  = "border-r border-border";

  return (
    <>
      <aside className={`${sidebarClass} ${borderClass} hidden md:flex`}>
        {navContent}
      </aside>

      <div
        className={[
          "fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 md:hidden",
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
