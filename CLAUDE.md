# Metria CRM — Guía para Claude

CRM inmobiliario para **Master Iberica**. Todo el código vive en `metria/`. Trabaja siempre desde esa carpeta.

## Stack

- **Next.js 16** (App Router, Server Components por defecto)
- **React 19** + **Tailwind CSS 4** (sin CSS modules ni CSS-in-JS)
- **TypeScript 5** estricto
- **Supabase** (PostgreSQL + Auth + RLS + `@supabase/ssr`)
- **lucide-react** para iconos
- **@hello-pangea/dnd** para drag & drop (Kanban)

## Comandos

```bash
cd metria
npm run dev              # dev server en http://localhost:3000
npm run build            # build producción
npm run lint             # eslint
npx tsc --noEmit         # type-check (usado con frecuencia)
supabase db push         # aplicar migraciones
```

No hay tests. No añadas ninguno salvo petición explícita.

## Estructura

```
metria/
├── middleware.ts                  # redirige a /login si no hay sesión
├── src/
│   ├── app/
│   │   ├── (auth)/                # login, recuperar, nueva-contrasena, sin-acceso
│   │   ├── (crm)/                 # rutas protegidas (todas usan AppShell)
│   │   │   ├── layout.tsx         # AppShell + InactivityGuard
│   │   │   ├── dashboard/         # Kanban + resumen + rendimiento
│   │   │   ├── zona/              # Zonas → Sectores → Fincas → Propiedades
│   │   │   ├── solicitudes/       # Pedidos de clientes (ruta interna: "pedidos" en DB)
│   │   │   ├── ordenes/           # Órdenes del día
│   │   │   ├── calendario/        # Google Calendar sync
│   │   │   ├── desarrollo/        # Métricas por agente
│   │   │   ├── usuarios/          # Admin de usuarios
│   │   │   ├── cuenta/            # Perfil + seguridad
│   │   │   ├── soporte/           # Tickets
│   │   │   └── calculadora/
│   │   ├── actions/               # Server actions compartidas (perfil, security)
│   │   ├── api/google/            # OAuth + sync Google Calendar
│   │   └── globals.css            # Tema (--color-*) + clase `.input`
│   ├── components/
│   │   ├── layout/                # app-shell, sidebar, header, page-header
│   │   ├── ui/                    # avatar, toast, breadcrumb, delete-confirmation-dialog
│   │   ├── dashboard/             # Kanban*, AgentOfMonth, SummaryCard, etc.
│   │   ├── propiedades/           # EncargoPanel
│   │   └── cuenta/
│   ├── lib/                       # Ver "Helpers" abajo
│   └── types/
│       ├── database.types.ts      # Tipos generados de Supabase
│       └── index.ts               # Aliases: Zona, Sector, Finca, Propiedad, Usuario, Pedido, Tarea, Agenda
└── supabase/migrations/           # SQL migrations
```

Alias TypeScript: `@/*` → `src/*`.

## Tres clientes de Supabase — no los mezcles

| Archivo | Cuándo | Notas |
|---|---|---|
| `@/lib/supabase` → `createClient()` | **Server Components / Server Actions** | `async`, usa cookies del usuario. RLS aplicado |
| `@/lib/supabase-browser` → `createClient()` | **Client Components** | Síncrono. Úsalo con `useMemo` para no recrear en cada render |
| `@/lib/supabase-admin` → `createAdminClient()` | **Server Actions privilegiadas** | Bypass RLS con `SUPABASE_SERVICE_ROLE_KEY`. Solo para operaciones de admin (crear usuarios, etc.) |

Patrón típico en un cliente:
```tsx
const supabase = useMemo(() => createClient(), []);
```

## Auth y permisos

- **`getCurrentUserContext()`** en `@/lib/current-user` — úsalo en TODO Server Component que necesite saber quién es el usuario. Devuelve rol normalizado, empresaId, equipoId, flags (`canDeleteZonas`, etc.) y agentes supervisados.
- **`USER_ROLES`** = `["Administrador", "Director", "Responsable", "Agente"]` (`@/lib/roles`).
- Helpers de permisos: `canManageUsers`, `canDeleteZonas`, `canViewAllAgents`, `canViewSupervisedAgents`, etc. Úsalos en lugar de hardcodear strings.
- Multi-tenant: filtra siempre por `empresa_id` del usuario actual si aplica (`currentUser.empresaId`).
- El middleware (`middleware.ts`) ya redirige a `/login` para rutas no públicas. Las rutas `(crm)/*` asumen usuario autenticado.

## Patrones UI establecidos

**Página CRM estándar:**
```tsx
// page.tsx (Server Component)
return (
  <>
    <PageHeader title="..." description="..." />
    <ClientComponent initialData={...} currentUserId={...} currentUserRole={...} />
  </>
)
```
No envuelvas la página en más cards. El `<main>` ya tiene `p-4 md:p-6` y fondo.

**Card/section base:** `rounded-2xl border border-border bg-surface shadow-sm`. **No anides cards dentro de cards.**

**Tablas:** usa `<table className="w-full text-sm">` con `<thead>` en `bg-background` y `<tbody className="divide-y divide-border">`. Filas con `hover:bg-background cursor-pointer` si son clicables.

**Input base:** clase `.input` definida en `globals.css`. Aplica también a `<select>` y `<textarea>`.

**Modales:** overlay con `fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4`, caja con `rounded-2xl bg-surface shadow-xl`. Ver ejemplos en `solicitudes-client.tsx`, `usuarios/users-management-panel.tsx`.

**Toasts:** `useToast` + `<Toaster>` en `@/components/ui/toast`. `toast("mensaje")` → success, `toast("msg", "error")`.

**Confirmación destructiva con contraseña:** usa `DeleteConfirmationDialog` (`@/components/ui/delete-confirmation-dialog`) para borrar zonas, sectores, fincas. Verifica con `verifyConfirmationPassword` del lado servidor (`@/lib/delete-confirmation-password`).

**Confirmación destructiva sin contraseña:** modal propio con botones. **Nunca uses `window.confirm`.**

**Avatares:** componente `<Avatar name={fullName} src={avatarUrl} size="md" />` en `@/components/ui/avatar`. Genera iniciales coloreadas deterministas cuando no hay `src`.

**Iconos:** `lucide-react` (ej. `import { Plus, Search, MoreVertical } from "lucide-react"`). Tamaño típico `h-4 w-4`.

**Colores semánticos (Tailwind tokens):**
`primary`, `primary-dark`, `primary-light`, `accent` (ámbar), `success` (verde), `danger` (rojo), `warning`, `text-primary`, `text-secondary`, `background`, `surface`, `border`, `muted`. Funcionan en light y dark mode. **No uses `bg-white`, `text-gray-500`, etc.** — rompen el dark mode.

**Dark mode:** activado con `html.dark`. Los tokens ya están definidos. Evita colores hardcoded.

## Convenciones de código

- **Server Components por defecto.** `"use client"` solo cuando haga falta (state, efectos, listeners, drag & drop).
- Tipado estricto. Nada de `any` salvo casos justificados.
- Naming: archivos en `kebab-case.tsx`, componentes en `PascalCase`, helpers en `camelCase`.
- Sin comentarios salvo casos no obvios (la memoria y el README explican el porqué).
- Imports agrupados: externos, luego `@/*`, luego relativos.
- Respeta la estructura `page.tsx` (Server) + `*-client.tsx` (Client). La página carga datos y pasa props.
- Mensajes de UI en español. Sin tildes en strings que se muestran (legado) — revisa el contexto del archivo antes de introducir `ó/á/é/í/ú/ñ`.

## Gotchas frecuentes

- **Renombrar carpetas ≠ actualizar contenido.** Si renombras `pedidos/` → `solicitudes/`, cambia también los textos visibles (`<h1>`, toasts, botones, sidebar).
- **Administrador es intocable.** No se puede eliminar ni cambiar de rol desde la UI. Los helpers y las actions ya lo protegen; respétalo.
- **`revalidatePath("/ruta")`** tras toda mutación en server actions.
- **Migraciones Supabase:** archivos en `supabase/migrations/` con formato `YYYYMMDD_descripcion.sql`. Si modificas el esquema, regenera `src/types/database.types.ts`.
- **No introduzcas dependencias nuevas** sin consultar. El stack es deliberadamente pequeño.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Incluye `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` cuando Claude hace el trabajo.

## Variables de entorno (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DELETE_CONFIRMATION_PASSWORD=   # fallback si no hay configuracion_seguridad en DB
```

## Modelo de datos (tablas principales)

`usuarios` · `empresas` · `equipos` · `zona` · `sectores` · `fincas` · `propiedades` · `pedidos` · `tareas` · `agenda` · `rendimiento` · `archivos` · `configuracion_seguridad` · `soporte_*`

Tipos importados desde `@/types`: `Zona`, `Sector`, `Finca`, `Propiedad`, `Usuario`, `Pedido`, `Tarea`, `Agenda`.
