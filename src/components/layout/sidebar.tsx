"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui.store";
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
  Map,
  ClipboardList,
  TrendingUp,
  Calendar,
  Calculator,
  FileText,
  LifeBuoy,
  Network,
  Users,
  BookUser,
  Building2,
  Mail,
  Settings,
  Shield,
  MessageCircle,
  X,
} from "lucide-react";

// ─── Grupos de navegación ─────────────────────────────────────────────────────

type NavAction = {
  labelKey: string;
  href: string;
  resourceKey: string;
  icon: React.ElementType;
};

type NavItemConfig = NavAction & {
  priority?: "core";
  badge?: string;
  favoriteSlot?: boolean;
  actions?: NavAction[];
};

type NavSectionConfig = {
  labelKey: string;
  items: NavItemConfig[];
};

const NAV_SECTIONS: NavSectionConfig[] = [
  {
    labelKey: "navigation.sectionPrincipal",
    items: [
      { labelKey: "navigation.dashboard", href: "/dashboard", resourceKey: "dashboard", icon: LayoutDashboard, priority: "core", favoriteSlot: true },
      { labelKey: "navigation.requests", href: "/solicitudes", resourceKey: "solicitudes", icon: ClipboardList, priority: "core", favoriteSlot: true },
      {
        labelKey: "navigation.zone",
        href: "/zona",
        resourceKey: "zona",
        icon: MapPin,
        priority: "core",
        favoriteSlot: true,
        actions: [
          { labelKey: "navigation.zoneMapAction", href: "/zonas-geograficas", resourceKey: "zonas-geograficas", icon: Map },
        ],
      },
      { labelKey: "navigation.properties", href: "/propiedades", resourceKey: "propiedades", icon: Building2 },
    ],
  },
  {
    labelKey: "navigation.sectionActivity",
    items: [
      { labelKey: "navigation.calendar", href: "/calendario", resourceKey: "calendario", icon: Calendar },
      { labelKey: "navigation.dayOrders", href: "/ordenes", resourceKey: "ordenes", icon: FileText },
      { labelKey: "navigation.communications", href: "/comunicaciones", resourceKey: "comunicaciones", icon: MessageCircle },
      { labelKey: "navigation.email", href: "/email", resourceKey: "email", icon: Mail },
    ],
  },
  {
    labelKey: "navigation.sectionCrm",
    items: [
      { labelKey: "navigation.contacts", href: "/contactos", resourceKey: "contactos", icon: BookUser },
    ],
  },
  {
    labelKey: "navigation.sectionTools",
    items: [
      { labelKey: "navigation.calculator", href: "/calculadora", resourceKey: "calculadora", icon: Calculator },
      { labelKey: "navigation.development", href: "/desarrollo", resourceKey: "desarrollo", icon: TrendingUp },
    ],
  },
];

// ─── Estilos compartidos de item ──────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  priority,
  actions = [],
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  priority?: "core";
  actions?: Array<NavAction & { label: string; active: boolean }>;
}) {
  const isCore = priority === "core";

  return (
    <motion.div variants={staggerItem}>
      <div className="group/item relative">
        <div
          className={[
            "pressable group/link flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            isCore ? "py-2.5 font-semibold" : "py-2 font-medium",
            active
              ? "bg-sidebar-active text-primary shadow-[inset_0_0_0_1px_rgba(37,99,235,0.16)]"
              : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary hover:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]",
          ].join(" ")}
        >
          <Link
            href={href}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : isCore
                    ? "bg-text-primary/[0.04] text-text-primary group-hover/link:bg-primary/10 group-hover/link:text-primary"
                    : "text-text-secondary group-hover/link:text-text-primary",
              ].join(" ")}
            >
              <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </Link>
          {actions.length > 0 && (
            <span
              className={[
                "ml-auto flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover/item:opacity-100 md:group-focus-within/item:opacity-100",
              ].join(" ")}
            >
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  aria-label={action.label}
                  title={action.label}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    action.active
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:bg-background hover:text-primary",
                  ].join(" ")}
                >
                  <action.icon className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </span>
          )}
          {active && actions.length === 0 && (
            <motion.span
              layoutId="sidebar-active"
              className="complete-pop ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NavGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="mb-1.5 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/55 first:mt-0">
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

  const sidebarOpen   = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const closeSidebar  = useUIStore((s) => s.closeSidebar);

  const userRole = _userRole ? normalizeUserRole(_userRole) : null;
  const role = userRole ?? "Agente";
  const canSeeUsers = canManageUsers(role);
  const canSeeOrganigrama = canViewOrgChart(role);
  const isAdmin = role === "Administrador";
  const deniedSet = new Set(deniedResourceKeys);

  function isNavVisible(key: string): boolean {
    return !deniedSet.has(key);
  }

  // Mantener compatibilidad con el evento legacy del Header (sidebar:toggle)
  useEffect(() => {
    window.addEventListener("sidebar:toggle", toggleSidebar);
    return () => window.removeEventListener("sidebar:toggle", toggleSidebar);
  }, [toggleSidebar]);

  // Cerrar al navegar
  useEffect(() => {
    const id = window.requestAnimationFrame(closeSidebar);
    return () => window.cancelAnimationFrame(id);
  }, [pathname, closeSidebar]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/zona") {
      return pathname === "/zona" || pathname.startsWith("/zona/") || pathname.startsWith("/zonas-geograficas");
    }
    return pathname.startsWith(href);
  }

  function itemIsVisible(item: NavItemConfig): boolean {
    return isNavVisible(item.resourceKey) || Boolean(item.actions?.some((action) => isNavVisible(action.resourceKey)));
  }

  function getVisibleActions(item: NavItemConfig) {
    return item.actions
      ?.filter((action) => isNavVisible(action.resourceKey))
      .map((action) => ({ ...action, label: t(action.labelKey), active: isActive(action.href) })) ?? [];
  }

  const navContent = (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-border bg-sidebar-logo px-4">
        <Image
          src="/logo-bg-master-iberica.png"
          alt="Master Ibérica"
          width={190}
          height={48}
          className="max-h-10 w-auto object-contain"
          priority
        />
        <button
          onClick={() => closeSidebar()}
          className="touch-target absolute right-2 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label={t("navigation.closeMenu")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Navegación ───────────────────────────────────────────── */}
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label={t("navigation.mainNavigation") || "Navegación principal"} style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}>

        {NAV_SECTIONS.map((section) => (
          <motion.div key={section.labelKey} variants={staggerContainer} initial="initial" animate="animate">
            <NavGroup label={t(section.labelKey)}>
              {section.items.filter(itemIsVisible).map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.labelKey)}
                  active={isActive(item.href)}
                  priority={item.priority}
                  actions={getVisibleActions(item)}
                />
              ))}
            </NavGroup>
          </motion.div>
        ))}

        {/* Gestión: base permission + configurable layer */}
        {(canSeeUsers || canSeeOrganigrama || isAdmin) && (
          <NavGroup label={t("navigation.sectionCompany")}>
            {canSeeUsers && isNavVisible("usuarios") && (
              <NavItem href="/usuarios" icon={Users} label={t("navigation.users")} active={isActive("/usuarios")} />
            )}
            {canSeeOrganigrama && isNavVisible("organigrama") && (
              <NavItem href="/empresa/organigrama" icon={Network} label={t("navigation.orgChart")} active={isActive("/empresa/organigrama")} />
            )}
            {isAdmin && isNavVisible("configuracion") && (
              <NavItem href="/configuracion/control-acceso" icon={Settings} label={t("navigation.accessControl")} active={isActive("/configuracion/control-acceso")} />
            )}
            {isAdmin && (
              <NavItem href="/seguridad" icon={Shield} label={t("navigation.audit")} active={isActive("/seguridad")} />
            )}
          </NavGroup>
        )}

        <div className="mt-5 border-t border-border pt-4">
          {isNavVisible("soporte") && (
            <NavGroup label={t("navigation.sectionSystem")}>
              <NavItem href="/soporte" icon={LifeBuoy} label={t("navigation.support")} active={isActive("/soporte")} />
            </NavGroup>
          )}
        </div>
      </nav>

    </div>
  );

  const sidebarClass = "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sidebar";
  const borderClass  = "border-r border-border";

  return (
    <>
      <aside className={`${sidebarClass} ${borderClass} hidden md:flex`} aria-label={t("navigation.sidebar") || "Menú lateral"}>
        {navContent}
      </aside>

      <div
        className={[
          "fixed inset-0 z-40 bg-overlay transition-opacity duration-300 md:hidden",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => closeSidebar()}
        aria-hidden="true"
      />
      <aside
        className={[
          `${sidebarClass} ${borderClass} transition-transform duration-300 ease-out md:hidden`,
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        ].join(" ")}
        aria-label={t("navigation.sidebar") || "Menú lateral"}
      >
        {navContent}
      </aside>
    </>
  );
}
