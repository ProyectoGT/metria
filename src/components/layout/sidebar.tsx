"use client";

import { useEffect, useState, useCallback } from "react";
import { useUIStore } from "@/stores/ui.store";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { canManageUsers, canViewInsights, canViewOrgChart, normalizeUserRole } from "@/lib/roles";
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
  BarChart3,
  Building2,
  Mail,
  Settings,
  Shield,
  MessageCircle,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

// ─── Grupos de navegación ─────────────────────────────────────────────────────

type NavAction = {
  labelKey: string;
  href: string;
  resourceKey: string;
  icon: React.ElementType;
  display?: "icon" | "subitem";
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
          { labelKey: "navigation.zoneMapAction", href: "/zonas-geograficas", resourceKey: "zonas-geograficas", icon: Map, display: "icon" },
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
      {
        labelKey: "navigation.development",
        href: "/desarrollo",
        resourceKey: "desarrollo",
        icon: TrendingUp,
        actions: [
          { labelKey: "navigation.businessIntelligence", href: "/desarrollo/insights", resourceKey: "desarrollo-insights", icon: BarChart3, display: "subitem" },
        ],
      },
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
  collapsed = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  priority?: "core";
  actions?: Array<NavAction & { label: string; active: boolean }>;
  collapsed?: boolean;
}) {
  const isCore = priority === "core";

  return (
    <motion.div variants={staggerItem}>
      <div className="group/item relative">
        <div
          className={[
            "pressable group/link flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            isCore ? "py-2.5 font-semibold" : "py-2 font-medium",
            collapsed && "justify-center px-0",
            active
              ? "bg-sidebar-active text-primary shadow-[inset_0_0_0_1px_rgba(37,99,235,0.16)]"
              : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary hover:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]",
          ].join(" ")}
          title={collapsed ? label : undefined}
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
            {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
          </Link>
          {!collapsed && actions.some((action) => action.display !== "subitem") && (
            <span
              className={[
                "ml-auto flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:duration-150 md:group-hover/item:opacity-100 md:group-focus-within/item:opacity-100",
              ].join(" ")}
            >
              {actions.filter((action) => action.display !== "subitem").map((action) => (
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
          {!collapsed && active && !actions.some((action) => action.display !== "subitem") && !actions.some((action) => action.display === "subitem") && (
            <motion.span
              layoutId="sidebar-active"
              className="complete-pop ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </div>
        {!collapsed && actions.some((action) => action.display === "subitem") && active && (
          <div className="ml-10 mt-1 space-y-1 border-l border-border pl-2">
            {actions.filter((action) => action.display === "subitem").map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={[
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  action.active
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary",
                ].join(" ")}
              >
                <action.icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{action.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NavGroup({ label, collapsed, children }: { label?: string; collapsed?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && !collapsed && (
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
  const canSeeInsights = canViewInsights(role);
  const isAdmin = role === "Administrador";
  const deniedSet = new Set(deniedResourceKeys);

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync sidebar collapsed state from localStorage after hydration.
  // Intentionally setState in effect — required for SSR-safe localStorage persistence.
  useEffect(() => {
    const stored = localStorage.getItem("metria-sidebar-collapsed");
    if (stored === "true") setIsCollapsed(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("metria-sidebar-collapsed", String(next));
      document.documentElement.style.setProperty("--sidebar-width", next ? "72px" : "260px");
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", isCollapsed ? "72px" : "260px");
  }, [isCollapsed]);

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
    if (href === "/usuarios") {
      return pathname.startsWith("/usuarios") || pathname.startsWith("/empresa/organigrama");
    }
    if (href === "/desarrollo") {
      return pathname.startsWith("/desarrollo");
    }
    return pathname.startsWith(href);
  }

  function actionIsVisible(action: NavAction): boolean {
    if (action.resourceKey === "organigrama") return canSeeOrganigrama && isNavVisible(action.resourceKey);
    if (action.resourceKey === "desarrollo-insights") return canSeeInsights;
    return isNavVisible(action.resourceKey);
  }

  function itemIsVisible(item: NavItemConfig): boolean {
    return isNavVisible(item.resourceKey) || Boolean(item.actions?.some(actionIsVisible));
  }

  function getVisibleActions(item: NavItemConfig) {
    return item.actions
      ?.filter(actionIsVisible)
      .map((action) => ({ ...action, label: t(action.labelKey), active: isActive(action.href) })) ?? [];
  }

  function getNavContent(collapsed: boolean) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div className={`flex h-16 shrink-0 items-center border-b border-border bg-sidebar-logo ${collapsed ? 'justify-center px-0' : 'justify-center px-4'}`}>
          {collapsed ? (
            <Image
              src="/favicon-32x32.png"
              alt="Master Ibérica"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          ) : (
            <Image
              src="/logo-bg-master-iberica.png"
              alt="Master Ibérica"
              width={240}
              height={56}
              className="max-h-20 w-auto object-contain"
              priority
            />
          )}
          {!collapsed && (
            <button
              onClick={() => closeSidebar()}
              className="touch-target absolute right-2 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label={t("navigation.closeMenu")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Navegación ───────────────────────────────────────────── */}
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label={t("navigation.mainNavigation") || "Navegación principal"} style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}>

          {NAV_SECTIONS.map((section) => (
            <motion.div key={section.labelKey} variants={staggerContainer} initial="initial" animate="animate">
              <NavGroup label={collapsed ? undefined : t(section.labelKey)} collapsed={collapsed}>
                {section.items.filter(itemIsVisible).map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={t(item.labelKey)}
                    active={isActive(item.href)}
                    priority={item.priority}
                    actions={getVisibleActions(item)}
                    collapsed={collapsed}
                  />
                ))}
              </NavGroup>
            </motion.div>
          ))}

          {/* Gestión: base permission + configurable layer */}
          {(canSeeUsers || canSeeOrganigrama) && (
            <NavGroup label={collapsed ? undefined : t("navigation.sectionCompany")} collapsed={collapsed}>
              {canSeeUsers && isNavVisible("usuarios") && (
                <NavItem
                  href="/usuarios"
                  icon={Users}
                  label={t("navigation.users")}
                  active={isActive("/usuarios")}
                  collapsed={collapsed}
                  actions={[
                    { labelKey: "navigation.userList", href: "/usuarios", resourceKey: "usuarios", icon: Users, display: "subitem", label: t("navigation.userList"), active: pathname.startsWith("/usuarios") },
                    ...(canSeeOrganigrama && isNavVisible("organigrama")
                      ? [{ labelKey: "navigation.orgChart", href: "/empresa/organigrama", resourceKey: "organigrama", icon: Network, display: "subitem" as const, label: t("navigation.orgChart"), active: pathname.startsWith("/empresa/organigrama") }]
                      : []),
                  ]}
                />
              )}
            </NavGroup>
          )}

          <div className="mt-5 border-t border-border pt-4">
            {(isNavVisible("soporte") || isAdmin) && (
              <NavGroup label={collapsed ? undefined : t("navigation.sectionSystem")} collapsed={collapsed}>
                {isNavVisible("soporte") && (
                  <NavItem href="/soporte" icon={LifeBuoy} label={t("navigation.support")} active={isActive("/soporte")} collapsed={collapsed} />
                )}
                {isAdmin && isNavVisible("configuracion") && (
                  <NavItem href="/configuracion/control-acceso" icon={Settings} label={t("navigation.accessControl")} active={isActive("/configuracion/control-acceso")} collapsed={collapsed} />
                )}
                {isAdmin && (
                  <NavItem href="/seguridad" icon={Shield} label={t("navigation.audit")} active={isActive("/seguridad")} collapsed={collapsed} />
                )}
              </NavGroup>
            )}
          </div>
        </nav>

        {/* ── Toggle button ─────────────────────────────────────────── */}
        <div className="border-t border-border p-3">
          <button
            onClick={toggleCollapsed}
            className={`flex w-full items-center gap-3 rounded-xl py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-sidebar-hover ${collapsed ? 'justify-center px-0' : 'px-3'}`}
            title={collapsed ? 'Expandir menú' : 'Minimizar menú'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>Minimizar menú</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-border transition-all duration-300 hidden md:flex ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}`} aria-label={t("navigation.sidebar") || "Menú lateral"}>
        {getNavContent(isCollapsed)}
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
          `fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sidebar border-r border-border transition-transform duration-300 ease-out md:hidden`,
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        ].join(" ")}
        aria-label={t("navigation.sidebar") || "Menú lateral"}
      >
        {getNavContent(false)}
      </aside>
    </>
  );
}
