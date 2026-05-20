# Plan: Sidebar minimizado/expandido

**Objetivo:** Añadir botón en la parte inferior del sidebar para alternar entre modo expandido (actual) y minimizado (solo iconos, 72px de ancho). Persistir estado en `localStorage`.

---

## Archivos a modificar (2)

### 1. `src/components/layout/sidebar.tsx`

**Imports a cambiar:**

```typescript
// ANTES:
import { useEffect } from "react";

// DESPUÉS:
import { useEffect, useState, useCallback } from "react";
```

**Añadir a los iconos de lucide-react:**
```typescript
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
  PanelLeftClose,   // ← añadir
  PanelLeftOpen,    // ← añadir
} from "lucide-react";
```

**Añadir estado y efectos después de `const deniedSet = new Set(deniedResourceKeys);`:**

```typescript
const [isCollapsed, setIsCollapsed] = useState(false);

useEffect(() => {
  const stored = localStorage.getItem('metria-sidebar-collapsed');
  if (stored === 'true') setIsCollapsed(true);
}, []);

const toggleCollapsed = useCallback(() => {
  setIsCollapsed(prev => {
    const next = !prev;
    localStorage.setItem('metria-sidebar-collapsed', String(next));
    document.documentElement.style.setProperty('--sidebar-width', next ? '72px' : '260px');
    return next;
  });
}, []);

useEffect(() => {
  document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '72px' : '260px');
}, [isCollapsed]);
```

**Modificar `NavItem` — añadir prop `collapsed`:**

Añadir `collapsed?: boolean;` a la interfaz de props del componente NavItem (línea 117):

```typescript
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
```

**Modificar `NavGroup` para ocultar label en collapsed:**

```typescript
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
```

**Convertir `navContent` a función:**

Reemplazar:
```typescript
const navContent = (
  <div className="flex h-full min-h-0 flex-col">
    ...
  </div>
);
```

Por:
```typescript
function getNavContent(collapsed: boolean) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className={`relative flex h-16 shrink-0 items-center border-b border-border bg-sidebar-logo ${collapsed ? 'justify-center px-0' : 'justify-center px-4'}`}>
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
            width={190}
            height={48}
            className="max-h-10 w-auto object-contain"
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
```

**Actualizar renderizado:**

Reemplazar las líneas de renderizado actuales (desde `const sidebarClass` hasta el final del componente) por:

```tsx
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
```

Nota: las variables `sidebarClass` y `borderClass` ya no se usan, se pueden eliminar.

---

### 2. `src/components/layout/app-shell.tsx`

Una sola línea modificada (línea 157):

**Antes:**
```tsx
<div className="flex h-full min-w-0 flex-col md:pl-[260px]">
```

**Después:**
```tsx
<div className="flex h-full min-w-0 flex-col transition-all duration-300" style={{ paddingLeft: 'var(--sidebar-width, 260px)' }}>
```

El `style` prop con string estático funciona en Server Components. La propiedad CSS `var(--sidebar-width, 260px)` usa el valor por defecto 260px si la variable no está definida (primer render o si algo falla).

---

## Resumen de cambios

| Archivo | Tipo de cambio | Líneas |
|---------|---------------|--------|
| `sidebar.tsx` | Import `useState, useCallback` + 2 iconos | +2 |
| `sidebar.tsx` | Estado `isCollapsed` + localStorage + CSS var | +15 |
| `sidebar.tsx` | `NavItem` prop `collapsed` | ~15 líneas modificadas |
| `sidebar.tsx` | `NavGroup` prop `collapsed` | ~5 líneas modificadas |
| `sidebar.tsx` | `navContent` → `getNavContent(collapsed)` | ~100 líneas reescritas |
| `sidebar.tsx` | Renderizado (2 aside + overlay) | ~30 líneas reescritas |
| `app-shell.tsx` | CSS variable en paddingLeft | 1 línea |

## Persistencia

- Clave: `metria-sidebar-collapsed` en `localStorage`
- Lectura en `useEffect` post-hidratación (SSR-safe, estado inicial `false`)
- Escritura en cada toggle
- Estado inicial SSR: `false` (expandido) → sin hydration mismatch

## Comportamiento

| Aspecto | Expandido | Minimizado |
|---------|-----------|------------|
| Ancho sidebar | 260px | 72px |
| Logo | `logo-bg-master-iberica.png` | `favicon-32x32.png` |
| Textos nav | Visibles | Ocultos |
| Tooltips | No | `title` attr en cada item |
| Secciones | Labels visibles | Ocultas |
| Acciones/íconos secundarios | Visibles | Ocultos |
| Botón toggle | "Minimizar menú" + `PanelLeftClose` | `PanelLeftOpen` centrado |
| Mobile drawer | No afectado (siempre expandido) | No afectado |
| Animación | `transition-all duration-300` | `transition-all duration-300` |
