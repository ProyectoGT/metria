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
  DatabaseBackup,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
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

type SidebarSectionKey =
  | "principal"
  | "activity"
  | "crm"
  | "tools"
  | "company"
  | "system";

const NAV_SECTIONS: NavSectionConfig[] = [
  {
    labelKey: "navigation.sectionPrincipal",
    items: [
      { labelKey: "navigation.dashboard", href: "/dashboard", resourceKey: "dashboard", icon: LayoutDashboard, priority: "core", favoriteSlot: true },
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
      { labelKey: "navigation.requests", href: "/solicitudes", resourceKey: "solicitudes", icon: ClipboardList, priority: "core", favoriteSlot: true },
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

const NAV_SECTION_KEYS: SidebarSectionKey[] = ["principal", "activity", "crm", "tools"];
const COLLAPSED_SECTIONS_STORAGE_KEY = "metria-sidebar-collapsed-sections";

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const NAV_ITEM_HEIGHT = "h-[42px]";
const NAV_ITEM_COLLAPSED_SIZE = "h-10 w-10";
const NAV_ICON_BOX = "h-7 w-7";
const NAV_ICON_SIZE = "h-[18px] w-[18px]";
const NAV_RADIUS = "rounded-xl";
const NAV_ACTIVE_INDICATOR = "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-primary";

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
  const hasInlineActions = !collapsed && actions.some((a) => a.display !== "subitem");
  const hasSubItems = !collapsed && actions.some((a) => a.display === "subitem");

  const containerClasses = [
    "group/item relative",
    !collapsed && active && NAV_ACTIVE_INDICATOR,
  ].filter(Boolean).join(" ");

  const buttonClasses = [
    "pressable inline-flex items-center outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar cursor-pointer",
    NAV_RADIUS,
    active
      ? "bg-sidebar-active text-primary"
      : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary",
    collapsed
      ? `${NAV_ITEM_COLLAPSED_SIZE} justify-center`
      : `${NAV_ITEM_HEIGHT} w-full gap-3 px-3`,
  ].join(" ");

  return (
    <motion.div variants={staggerItem}>
      <div className={containerClasses}>
        <Link
          href={href}
          className={buttonClasses}
          title={collapsed ? label : undefined}
        >
          <span
            className={[
              "flex shrink-0 items-center justify-center",
              NAV_ICON_BOX,
              NAV_RADIUS,
              "transition-colors duration-150",
              active
                ? "bg-primary/10 text-primary"
                : isCore
                  ? "bg-text-primary/[0.04] text-text-primary group-hover:bg-primary/10 group-hover:text-primary"
                  : "text-text-secondary group-hover:text-text-primary",
            ].join(" ")}
          >
            <Icon className={NAV_ICON_SIZE} aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {label}
            </span>
          )}
        </Link>
        {hasInlineActions && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/item:opacity-100 group-focus-within/item:opacity-100">
            {actions.filter((action) => action.display !== "subitem").map((action) => (
              <Link
                key={action.href}
                href={action.href}
                aria-label={action.label}
                title={action.label}
                className={[
                  "flex h-7 w-7 items-center justify-center",
                  NAV_RADIUS,
                  "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
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
        {!collapsed && active && !hasInlineActions && !hasSubItems && (
          <motion.span
            layoutId="sidebar-active"
            className="complete-pop absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        {hasSubItems && active && (
          <div className="ml-[52px] mt-1 space-y-0.5 border-l border-border pl-3">
            {actions.filter((action) => action.display === "subitem").map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={[
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
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

function NavGroup({
  label,
  collapsed,
  groupCollapsed = false,
  onToggle,
  children,
}: {
  label?: string;
  collapsed?: boolean;
  groupCollapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={collapsed ? "flex flex-col items-center gap-0.5" : "space-y-0.5"}>
      {label && !collapsed && (
        <div className="mb-2 mt-6 flex items-center justify-between px-3 first:mt-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary/50">
            {label}
          </p>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-text-secondary/50 transition-colors hover:bg-sidebar-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              aria-label={groupCollapsed ? `Mostrar ${label}` : `Ocultar ${label}`}
              title={groupCollapsed ? `Mostrar ${label}` : `Ocultar ${label}`}
            >
              <ChevronDown
                className={[
                  "h-3.5 w-3.5 transition-transform duration-150",
                  groupCollapsed ? "-rotate-90" : "rotate-0",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      )}
      {collapsed && label && (
        <div className="my-2 h-px w-5 rounded-full bg-border" aria-hidden="true" />
      )}
      {!groupCollapsed && children}
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
  const canSeeBackups = role === "Administrador" || role === "Director";
  const deniedSet = new Set(deniedResourceKeys);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<SidebarSectionKey>>(() => new Set());

  // Sync sidebar collapsed state from localStorage after hydration.
  // Intentionally setState in effect — required for SSR-safe localStorage persistence.
  useEffect(() => {
    const stored = localStorage.getItem("metria-sidebar-collapsed");
    if (stored === "true") setIsCollapsed(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return;
      const valid = new Set<SidebarSectionKey>(
        parsed.filter((key): key is SidebarSectionKey =>
          ["principal", "activity", "crm", "tools", "company", "system"].includes(key),
        ),
      );
      setCollapsedSections(valid); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      localStorage.removeItem(COLLAPSED_SECTIONS_STORAGE_KEY);
    }
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

  const toggleSection = useCallback((sectionKey: SidebarSectionKey) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      localStorage.setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  function isSectionCollapsed(sectionKey: SidebarSectionKey, sidebarCollapsed: boolean): boolean {
    return !sidebarCollapsed && collapsedSections.has(sectionKey);
  }

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
        <div suppressHydrationWarning className={`flex h-16 shrink-0 items-center border-b border-border bg-sidebar-logo ${collapsed ? 'justify-center' : 'justify-center px-4'}`}>
          {collapsed ? (
            <Image
              suppressHydrationWarning
              src="/favicon-32x32.png"
              alt="Master Ibérica"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          ) : (
            <Image
              suppressHydrationWarning
              src="/logo-bg-master-iberica.png"
              alt="Master Ibérica"
              width={240}
              height={56}
              className="max-h-16 w-auto max-w-full object-contain"
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
        <nav
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'space-y-1 px-4 py-5' : 'space-y-1 px-[14px] py-5'}`}
          aria-label={t("navigation.mainNavigation") || "Navegación principal"}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
        >

          {NAV_SECTIONS.map((section, index) => {
            const sectionKey = NAV_SECTION_KEYS[index];
            const groupCollapsed = isSectionCollapsed(sectionKey, collapsed);
            return (
              <motion.div key={section.labelKey} variants={staggerContainer} initial="initial" animate="animate">
                <NavGroup
                  label={collapsed ? undefined : t(section.labelKey)}
                  collapsed={collapsed}
                  groupCollapsed={groupCollapsed}
                  onToggle={collapsed ? undefined : () => toggleSection(sectionKey)}
                >
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
            );
          })}

          {/* Gestión: base permission + configurable layer */}
          {(canSeeUsers || canSeeOrganigrama) && (
            <NavGroup
              label={collapsed ? undefined : t("navigation.sectionCompany")}
              collapsed={collapsed}
              groupCollapsed={isSectionCollapsed("company", collapsed)}
              onToggle={collapsed ? undefined : () => toggleSection("company")}
            >
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
              <NavGroup
                label={collapsed ? undefined : t("navigation.sectionSystem")}
                collapsed={collapsed}
                groupCollapsed={isSectionCollapsed("system", collapsed)}
                onToggle={collapsed ? undefined : () => toggleSection("system")}
              >
                {isNavVisible("soporte") && (
                  <NavItem href="/soporte" icon={LifeBuoy} label={t("navigation.support")} active={isActive("/soporte")} collapsed={collapsed} />
                )}
                {isAdmin && isNavVisible("configuracion") && (
                  <NavItem href="/configuracion/control-acceso" icon={Settings} label={t("navigation.accessControl")} active={isActive("/configuracion/control-acceso")} collapsed={collapsed} />
                )}
                {canSeeBackups && isNavVisible("backups") && (
                  <NavItem href="/backups" icon={DatabaseBackup} label={t("navigation.backups")} active={isActive("/backups")} collapsed={collapsed} />
                )}
                {isAdmin && (
                  <NavItem href="/seguridad" icon={Shield} label={t("navigation.audit")} active={isActive("/seguridad")} collapsed={collapsed} />
                )}
              </NavGroup>
            )}
          </div>
        </nav>

        {/* ── Toggle button ─────────────────────────────────────────── */}
        <div className={`border-t border-border ${collapsed ? 'flex justify-center px-4 py-3' : 'px-[14px] py-3'}`}>
          <button
            onClick={toggleCollapsed}
            className={[
              "inline-flex items-center outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar cursor-pointer",
              NAV_RADIUS,
              "text-sm font-medium text-text-secondary hover:bg-sidebar-hover hover:text-text-primary",
              collapsed
                ? `${NAV_ITEM_COLLAPSED_SIZE} justify-center`
                : `${NAV_ITEM_HEIGHT} w-full gap-3 px-3`,
            ].join(" ")}
            title={collapsed ? "Expandir menú" : "Minimizar menú"}
          >
            {collapsed ? (
              <PanelLeftOpen className={NAV_ICON_SIZE} />
            ) : (
              <>
                <PanelLeftClose className={NAV_ICON_SIZE} />
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
