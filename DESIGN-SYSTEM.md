# Design System — Metria CRM

Filosofía visual: **"Structured Calm"** — moderno, limpio, minimalista y premium.
Cards amplias, mucho aire, jerarquía clara, dark mode excelente.

---

## Tokens de color

Definidos en `src/app/globals.css` dentro del bloque `@theme {}`.
Los overrides de tema están en `html[data-theme="light"]` implícito, `html[data-theme="dark"]` y `html[data-theme="dark-black"]`, manteniendo compatibilidad con las clases `dark` y `dark-black`.

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `bg-background` | #f8fafc | #09090b | Fondo de página |
| `bg-surface` | #ffffff | #111113 | Fondo de cards |
| `bg-surface-elevated` | #ffffff | #1c2940 | Dropdowns, headers de card, footers de modal |
| `bg-surface-raised` | #f1f5f9 | #18181b | Fondos dentro de cards |
| `bg-muted` | #f1f5f9 | #18181b | Fondos sutiles, thead |
| `text-text-primary` | #0f172a | #fafafa | Texto principal |
| `text-text-secondary` | #64748b | #a1a1aa | Texto secundario |
| `border-border` | #e2e8f0 | #27272a | Bordes |
| `border-border-strong` | #cbd5e1 | #475569 | Bordes en hover/foco suave |
| `bg-sidebar` | #ffffff | #101827 | Sidebar |
| `bg-sidebar-hover` | #f1f5f9 | #1d2a3f | Hover del sidebar |
| `bg-sidebar-active` | #eff6ff | #17345d | Navegación activa |
| `bg-overlay` | rgba(...) | rgba(...) | Overlays de modales/drawers |
| `bg-map-surface` | #ffffff | #172033 | Contenedores de mapa |
| `text-primary` | #2563eb | = | Acción primaria |
| `text-success` | #16a34a | = | Éxito |
| `text-danger` | #dc2626 | = | Error / Destructivo |
| `text-warning` | #f59e0b | = | Advertencia / Amber |

Los tokens canónicos están en `src/app/globals.css`; las clases semánticas y mapas de estado están en `src/lib/design-system.ts`.

La preferencia de tema se guarda en `localStorage`, cookie `metria-theme` y `user_preferences.theme`, y se aplica antes de la hidratación desde `ThemeScript`.

---

## Espaciado (escala 4px)

Usar **solo** estos valores. No usar gap-1.5, gap-2.5, gap-3, gap-5.

| Nombre | Valor | Clases |
|--------|-------|--------|
| xs | 4px | `gap-1`, `p-1` |
| sm | 8px | `gap-2`, `p-2` |
| md | 16px | `gap-4`, `p-4` |
| lg | 24px | `gap-6`, `p-6` |
| xl | 32px | `gap-8`, `p-8` |

---

## Border radius

| Nivel | Clase | Uso |
|-------|-------|-----|
| sm | `rounded-lg` (8px) | Botones, inputs, badges, chips |
| md | `rounded-xl` (12px) | Cards pequeñas, panels, dropdowns |
| lg | `rounded-2xl` (16px) | Modales, drawers, stat cards, tablas |

---

## Sombras

| Nivel | Clase | Uso |
|-------|-------|-----|
| layer-1 | `shadow-sm` | Cards en reposo |
| layer-2 | `shadow-md` | Hover de cards, dropdowns |
| layer-3 | `shadow-xl` | Modales, drawers activos |

---

## Tipografía

| Rol | Clases | Uso |
|-----|--------|-----|
| Display | `text-2xl font-bold` | Títulos de página (h1) |
| Heading | `text-lg font-semibold` | Títulos de sección / card |
| Subheading | `text-sm font-semibold` | Subtítulos, thead |
| Body | `text-sm` | Contenido estándar |
| Caption | `text-xs font-medium` | Labels, hints, badges |
| Micro | `text-[11px]` | Contadores, timestamps |

---

## Z-index

| Capa | Valor | Componentes |
|------|-------|-------------|
| dropdown | 20 (`z-20`) | Menús, selects |
| modal | 30 (`z-[30]`) | Modales / Dialogs |
| drawer | 40 (`z-[40]`) | Drawers laterales |
| toast | 50 (`z-[50]`) | Notificaciones |
| tooltip | 60 (`z-[60]`) | Tooltips |

---

## Componentes disponibles

### Primitivos (`src/components/ui/`)

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `Button` | `button.tsx` | Botón con variantes: primary, secondary, ghost, danger, outline |
| `Badge` | `badge.tsx` | Etiqueta base: default, primary, success, warning, danger, muted |
| `PriorityBadge` | `badge.tsx` | Prioridades centralizadas: baja, media, alta |
| `StatusBadge` | `badge.tsx` | Estados centralizados: pendiente, en curso, completado, cancelado |
| `Input` / `Textarea` / `Select` | `input.tsx` | Campos conectados a la clase global `.input` |
| `Dropdown` / `DropdownItem` | `dropdown.tsx` | Superficie flotante y opción de menú con foco consistente |
| `Card` | `card.tsx` | Contenedor base con border + surface + shadow |
| `StatCard` | `card.tsx` | Métrica numérica con icono y trend |
| `SectionCard` | `card.tsx` | Sección con header, título y slot de acción |
| `Avatar` | `avatar.tsx` | Avatar con imagen o iniciales determinísticas |
| `Modal` | `modal.tsx` | Dialog con Root/Header/Body/Footer |
| `Drawer` | `drawer.tsx` | Panel lateral deslizante |
| `Tabs` + `Tab` | `tabs.tsx` | Navegación por pestañas: underline y pill |
| `EmptyState` | `empty-state.tsx` | Estado vacío con icono, título y CTA |
| `FilterBar` | `filter-bar.tsx` | Barra de filtros con contador de activos |
| `Table*` | `table.tsx` | Familia: TableContainer, Table, TableHead, Th, TableBody, Tr, Td |
| `DeleteConfirmationDialog` | `delete-confirmation-dialog.tsx` | Confirmación destructiva con contraseña |
| `Toast` / `Toaster` | `toast.tsx` | Sistema de notificaciones |
| `Skeleton*` | `skeleton.tsx` | Loading states por página |

### Layout (`src/components/layout/`)

| Componente | Descripción |
|------------|-------------|
| `PageHeader` | Cabecera de página con `title`, `description`, `actions`, `back` |
| `Sidebar` | Navegación lateral (220px fijo desktop, drawer mobile) |
| `Header` | Cabecera sticky con search, notificaciones y perfil |
| `AppShell` | Layout raíz: Sidebar + Header + main |

---

## Constantes de tema (`src/lib/design-system.ts` y `src/lib/theme.ts`)

Para evitar colores hardcoded en badges y estados:

```tsx
import { PRIORITY_TONE, STATUS_TONE, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/design-system";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";

<PriorityBadge priority="alta" />
<StatusBadge status="en_progreso" />

<span className={PRIORITY_TONE.media.badge}>{PRIORITY_LABEL.media}</span>
<span className={STATUS_TONE.completado.badge}>{STATUS_LABEL.completado}</span>
```

---

## Contrato minimo de tokens

Este contrato permite evolucionar la UI sin redisenarla de golpe. En codigo nuevo, usar tokens semanticos antes que clases visuales sueltas.

| Token | Uso |
|-------|-----|
| `bg-background` | Fondo general de pagina o app shell |
| `bg-surface` | Cards, paneles, inputs y superficies base |
| `bg-surface-muted` | Fondos secundarios dentro de una superficie |
| `border-border` | Bordes neutrales |
| `text-text-primary` | Texto principal |
| `text-text-secondary` | Texto auxiliar, labels y hints |
| `bg-primary` / `text-primary` | Accion principal o enfasis interactivo |
| `bg-danger` / `text-danger` | Acciones destructivas y errores |
| `bg-success` / `text-success` | Exito, completado, activo |
| `bg-warning` / `text-warning` | Advertencias y atencion |
| `bg-primary-soft` | Fondo suave de enfasis primario |
| `bg-danger-soft` | Fondo suave de error |
| `bg-success-soft` | Fondo suave de exito |
| `bg-warning-soft` | Fondo suave de advertencia |

Evitar `bg-white`, `text-gray-*`, `border-gray-*` y hexadecimales en nuevo codigo cuando exista token equivalente. Las reglas de compatibilidad dark mode solo existen para migracion incremental.

---

## Estados interactivos

| Estado | Patron |
|--------|--------|
| Hover | `hover:bg-state-hover`, `hover:border-border-strong` |
| Focus | `focus-visible:ring-state-focus` o `UI.focus` |
| Disabled | `disabled:bg-disabled-bg disabled:text-disabled-text disabled:opacity-60` |
| Loading | `LoadingState`, `Button loading` o `bg-state-loading` en skeletons puntuales |
| Active/selected | `bg-state-active`, `border-primary`, `ring-state-focus` |

---

## Componentes prioritarios

1. `Button`
2. `Input`, `Textarea`, `Select`
3. `Badge`, `PriorityBadge`, `StatusBadge`
4. `Card`, `SectionCard`
5. `TableContainer`, `Table`, `TableHead`, `Th`, `TableBody`, `Tr`, `Td`
6. `Modal`, `Drawer`
7. `EmptyState`, `LoadingState`, `ErrorState`

---

## Plan de migracion incremental

1. Mantener primitives en `src/components/ui` antes de tocar pantallas.
2. En cada PR, reemplazar duplicados visibles solo dentro del area funcional modificada.
3. Migrar primero `Button`, `Input`, `Select`, `Badge` y `Card`.
4. Consolidar tablas despues con la familia `Table*`.
5. Usar `EmptyState`, `LoadingState` y `ErrorState` para estados de datos antes de crear variantes locales.
6. Eliminar clases hardcoded solo cuando exista token equivalente.
7. Validar light, dark y dark-black antes de considerar una pantalla migrada.

---

## Criterios de aceptacion para nuevas UI

- Usa tokens semanticos para superficie, texto, borde e intents.
- No introduce colores hardcoded si existe token.
- Tiene estados hover, focus, disabled y loading definidos.
- Funciona con teclado y focus visible.
- Se ve correctamente en light, dark y dark-black.
- Usa primitives existentes antes de crear componentes visuales nuevos.
- No cambia layout global ni jerarquia visual fuera del alcance del flujo tocado.

`src/lib/theme.ts` mantiene exports compatibles (`PRIORITY_BADGE`, `ESTADO_PROPIEDAD`, `ROL_BADGE`, `ESTADO_USUARIO`) para no romper módulos existentes mientras se migra.

---

## Reglas de uso

1. **Tokens siempre sobre hardcoded.** `bg-surface` no `bg-white`. `text-text-secondary` no `text-gray-500`.
2. **Un componente, una responsabilidad.** No pases lógica de negocio a componentes UI.
3. **El KanbanBoard es intocable.** Nunca modificar la estructura de nodos `Droppable`/`Draggable`.
4. **Dark mode automático.** Si usas solo tokens del sistema, dark mode funciona sin clases `dark:` extra.
5. **Accesibilidad básica.** Todos los botones y links tienen `focus-visible:ring-*`. No eliminar estos estilos.
6. **Escala de spacing.** Solo xs/sm/md/lg/xl. Nada de valores ad-hoc.

---

## Estructura de un modal estándar

```tsx
<Modal open={open} onClose={close} size="md">
  <ModalHeader title="Título" onClose={close} />
  <ModalBody>
    {/* contenido scrollable */}
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={close}>Cancelar</Button>
    <Button onClick={save} loading={saving}>Guardar</Button>
  </ModalFooter>
</Modal>
```

## Estructura de una página estándar

```tsx
// page.tsx (Server Component)
return (
  <>
    <PageHeader
      title="Solicitudes"
      description="Gestión de pedidos de clientes."
      actions={<Button size="sm">+ Nueva solicitud</Button>}
    />
    <ClientComponent initialData={data} />
  </>
);

// *-client.tsx (Client Component)
return (
  <div className="space-y-6">
    <FilterBar activeCount={activeFilters} onClear={clearFilters}>
      {/* selects, inputs de filtro */}
    </FilterBar>
    <TableContainer>
      <Table>
        <TableHead>…</TableHead>
        <TableBody>…</TableBody>
      </Table>
    </TableContainer>
  </div>
);
```
