# Metria CRM — Guía Técnica Completa para Claude / Codex

> **Instrucción de mantenimiento:** Este archivo es la fuente de verdad técnica del proyecto.
> - Consúltalo al inicio de **toda** sesión de trabajo en este repositorio.
> - **Actualízalo** cada vez que añadas, elimines o modifiques: rutas, tablas, componentes, patrones, dependencias, variables de entorno o reglas de permisos.
> - Usa el formato existente. Añade una entrada en el [Changelog](#17-changelog) con fecha y descripción del cambio.

---

## Tabla de contenidos

1. [Qué es Metria](#1-qué-es-metria)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura de directorios](#3-estructura-de-directorios)
4. [Arquitectura y flujo de datos](#4-arquitectura-y-flujo-de-datos)
5. [Autenticación y sesión](#5-autenticación-y-sesión)
6. [Modelo de datos (Supabase / PostgreSQL)](#6-modelo-de-datos-supabase--postgresql)
7. [Roles y permisos](#7-roles-y-permisos)
8. [Módulos de la aplicación](#8-módulos-de-la-aplicación)
9. [Clientes de Supabase — reglas de uso](#9-clientes-de-supabase--reglas-de-uso)
10. [Patrones UI establecidos](#10-patrones-ui-establecidos)
11. [Convenciones de código](#11-convenciones-de-código)
12. [Integración Google Calendar](#12-integración-google-calendar)
13. [Seguridad](#13-seguridad)
14. [Variables de entorno](#14-variables-de-entorno)
15. [Comandos de desarrollo](#15-comandos-de-desarrollo)
16. [Gotchas y trampas frecuentes](#16-gotchas-y-trampas-frecuentes)
17. [Changelog](#17-changelog)

---

## 1. Qué es Metria

**Metria** es un CRM inmobiliario SaaS en español desarrollado para **Master Iberica** (`masteriberica.digital`). Centraliza la operativa completa de una agencia inmobiliaria:

- Organización jerárquica del territorio: **Zonas → Sectores → Fincas → Propiedades**
- Ciclo de vida de propiedades: **Noticia → Investigación → Encargo → Venta**
- Gestión de pedidos (solicitudes) de clientes
- Kanban personal de tareas por agente (drag & drop)
- Control de rendimiento mensual/anual por agente vs. objetivos
- Agenda integrada con Google Calendar (OAuth 2.0)
- Control de acceso multi-rol con Row-Level Security en base de datos
- Módulo de soporte interno (tickets)
- Calculadoras inmobiliarias (comisiones, rentabilidades)

**Repositorio:** `https://github.com/ProyectoGT/metria`
**Rama principal:** `main`
**Idioma de la UI:** Español

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16 | Server Components por defecto |
| UI | React | 19 | `"use client"` solo cuando necesario |
| Estilos | Tailwind CSS | 4 | Sin CSS Modules ni CSS-in-JS |
| Lenguaje | TypeScript | 5 | Modo estricto. Cero `any` injustificados |
| Base de datos | Supabase (PostgreSQL) | — | RLS habilitado en todas las tablas críticas |
| Auth | Supabase Auth + JWT | — | Cookies HTTP-only via `@supabase/ssr` |
| Drag & drop | @hello-pangea/dnd | — | Kanban del dashboard |
| Iconos | lucide-react | — | Tamaño estándar `h-4 w-4` |
| Integración | Google Calendar API | v3 | OAuth 2.0, solo lectura/escritura de agenda |
| Linter | ESLint | — | Config en `eslint.config.mjs` |
| Testing | Vitest | 4 | Solo tests de fórmulas de calculadora (`src/__tests__/`) |

**No introduzcas dependencias nuevas** sin consultar. El stack es deliberadamente pequeño.

---

## 3. Estructura de directorios

```
metria/
├── middleware.ts                  # Guards de autenticación de rutas
├── next.config.ts                 # Config de Next.js
├── postcss.config.mjs             # Necesario para Tailwind 4
├── eslint.config.mjs
├── tsconfig.json                  # paths: @/* → src/*
├── .env.local.example             # Plantilla de variables de entorno
│
├── public/                        # Assets estáticos
├── scripts/                       # Scripts de utilidad (migraciones, etc.)
│
├── src/
│   ├── __tests__/
│   │   └── calculator-formulas.test.ts  # Tests unitarios del módulo calculadora (vitest)
│   │
│   ├── app/
│   │   ├── globals.css            # Tema CSS (tokens --color-*) + clase base .input
│   │   ├── layout.tsx             # Root layout (html, body, fuente)
│   │   │
│   │   ├── (auth)/                # Rutas públicas sin AppShell
│   │   │   ├── login/             # Página de inicio de sesión
│   │   │   ├── recuperar/         # Solicitud de recuperación de contraseña
│   │   │   ├── nueva-contrasena/  # Restablecimiento tras enlace de email
│   │   │   └── sin-acceso/        # Página de error de permisos
│   │   │
│   │   ├── (crm)/                 # Rutas protegidas — requieren sesión activa
│   │   │   ├── layout.tsx         # AppShell + InactivityGuard (cierre automático)
│   │   │   ├── dashboard/         # Pantalla principal: KanbanBoard + resumen + rendimiento
│   │   │   ├── zona/              # Navegación jerárquica Zona→Sector→Finca→Propiedad
│   │   │   ├── propiedades/       # Listado global de propiedades + EncargoPanel
│   │   │   ├── solicitudes/       # Pedidos de clientes (tabla `pedidos` en DB)
│   │   │   ├── ordenes/           # Órdenes del día con prioridades
│   │   │   ├── calendario/        # Vista de agenda + sync Google Calendar
│   │   │   ├── desarrollo/        # Métricas y objetivos por agente
│   │   │   ├── calculadora/       # Herramientas de cálculo inmobiliario
│   │   │   ├── usuarios/          # Gestión de usuarios (solo Administrador)
│   │   │   ├── cuenta/            # Perfil, avatar, seguridad, vinculación Google
│   │   │   └── soporte/           # Sistema de tickets de soporte interno
│   │   │
│   │   ├── actions/               # Server Actions compartidas entre rutas
│   │   │   ├── perfil.ts          # Actualizar perfil, avatar
│   │   │   └── security.ts        # Contraseña de confirmación, seguridad de cuenta
│   │   │
│   │   └── api/
│   │       └── google/            # Endpoints OAuth 2.0 + sync Google Calendar
│   │           ├── auth/          # Inicio del flujo OAuth
│   │           ├── callback/      # Callback de Google tras autorización
│   │           └── sync/          # Sincronización eventos ↔ tabla `agenda`
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-shell.tsx      # Layout raíz del CRM: sidebar + header + main
│   │   │   ├── sidebar.tsx        # Navegación lateral con roles
│   │   │   ├── header.tsx         # Barra superior: breadcrumb + avatar + acciones
│   │   │   └── page-header.tsx    # Título + descripción de cada página
│   │   │
│   │   ├── ui/                    # Componentes reutilizables genéricos
│   │   │   ├── avatar.tsx         # Iniciales coloreadas deterministas o foto
│   │   │   ├── toast.tsx          # Sistema de notificaciones (useToast + Toaster)
│   │   │   ├── breadcrumb.tsx     # Navegación jerárquica
│   │   │   └── delete-confirmation-dialog.tsx  # Modal de borrado con contraseña
│   │   │
│   │   ├── dashboard/
│   │   │   ├── kanban-board.tsx   # Tablero drag & drop (@hello-pangea/dnd)
│   │   │   ├── summary-card.tsx   # Tarjetas de resumen (Noticias, Encargos, etc.)
│   │   │   ├── agent-of-month.tsx # Componente agente del mes
│   │   │   └── performance-table.tsx  # Tabla de rendimiento del equipo
│   │   │
│   │   ├── propiedades/
│   │   │   └── encargo-panel.tsx  # Panel lateral de detalle/encargo de propiedad
│   │   │
│   │   └── cuenta/
│   │       └── profile-form.tsx   # Formulario de edición de perfil
│   │
│   ├── modules/                   # Módulos verticales autocontenidos
│   │   └── calculator/            # Calculadora inmobiliaria modular
│   │       ├── types.ts           # CalculatorType, CommissionResult, etc.
│   │       ├── components/
│   │       │   ├── CalculatorDashboard.tsx   # Hub de herramientas (orquestador)
│   │       │   ├── CalculatorShell.tsx       # Wrapper con breadcrumb + acciones
│   │       │   ├── CalculatorActions.tsx     # Barra de acciones comerciales
│   │       │   ├── CalculatorCard.tsx        # Card del grid de calculadoras
│   │       │   ├── ResultSummary.tsx         # Panel de resultados (ResultRow, AdvisoryNote)
│   │       │   ├── NumericSliderField.tsx    # Input numérico + slider dual
│   │       │   ├── CompactNumberField.tsx    # Input numérico compacto
│   │       │   ├── FormField.tsx             # Wrapper de label + hint + error
│   │       │   └── format.ts                 # formatCurrency, formatDecimal, formatPercent
│   │       ├── calculators/        # 8 calculadoras individuales
│   │       │   ├── simple-commission/       # "Calculadora simplificada" — comisión rápida
│   │       │   ├── purchase/                # "Comprar vivienda" — viabilidad
│   │       │   ├── mortgage/                # "Hipoteca avanzada"
│   │       │   ├── purchase-costs/          # "Gastos de compraventa"
│   │       │   ├── plusvalia/               # "Plusvalía municipal"
│   │       │   ├── seller-net/              # "Venta de vivienda" — neto vendedor
│   │       │   ├── investment/              # "Rentabilidad inversión"
│   │       │   └── max-budget/              # "Precio máximo comprador"
│   │       ├── formulas/           # Lógica de negocio pura (sin React)
│   │       │   ├── number.ts       # parseNumberInput, clamp, roundMoney, isValidNumberInput
│   │       │   ├── commission.ts   # calculateCommission (base_to_final / final_to_net)
│   │       │   ├── mortgage.ts
│   │       │   ├── purchaseCosts.ts
│   │       │   ├── purchase.ts
│   │       │   ├── investment.ts
│   │       │   ├── plusvalia.ts
│   │       │   ├── sellerNet.ts
│   │       │   └── maxBudget.ts
│   │       ├── schemas/            # Zod: validación de formularios (8 esquemas)
│   │       │   ├── common.ts, resolver.ts
│   │       │   ├── mortgage.schema.ts, purchase.schema.ts, ...
│   │       │   └── max-budget.schema.ts
│   │       └── services/
│   │           └── simulations.service.ts   # CRUD de simulaciones guardadas (stubs Fase 2)
│   │
│   ├── lib/
│   │   ├── supabase.ts            # createClient() para Server Components/Actions
│   │   ├── supabase-browser.ts    # createClient() para Client Components
│   │   ├── supabase-admin.ts      # createAdminClient() — bypass RLS
│   │   ├── current-user.ts        # getCurrentUserContext() — contexto completo del usuario
│   │   ├── roles.ts               # USER_ROLES + helpers de permisos
│   │   ├── delete-confirmation-password.ts  # verifyConfirmationPassword()
│   │   └── utils.ts               # Utilidades genéricas (fechas, formato, etc.)
│   │
│   └── types/
│       ├── database.types.ts      # Tipos autogenerados por Supabase CLI
│       └── index.ts               # Aliases: Zona, Sector, Finca, Propiedad, Usuario,
│                                  #          Pedido, Tarea, Agenda, Rendimiento
│
└── supabase/
    └── migrations/                # Archivos SQL en formato YYYYMMDD_descripcion.sql
```

**Alias TypeScript:** `@/*` → `src/*`

---

## 4. Arquitectura y flujo de datos

### Patrón Server Component + Client Component

Toda página del CRM sigue este patrón:

```tsx
// app/(crm)/modulo/page.tsx  ← Server Component
const currentUser = await getCurrentUserContext();
const { data } = await supabase.from("tabla").select("*").eq("empresa_id", currentUser.empresaId);

return (
  <>
    <PageHeader title="Módulo" description="Descripción" />
    <ModuloClient
      initialData={data}
      currentUserId={currentUser.id}
      currentUserRole={currentUser.role}
    />
  </>
);
```

```tsx
// app/(crm)/modulo/modulo-client.tsx  ← Client Component ("use client")
// Gestiona estado local, interacciones, formularios
// Llama a Server Actions para mutaciones
```

### Flujo de mutaciones (Server Actions)

```
Client Component
  → llama Server Action (app/actions/ o inline en page)
    → createAdminClient() si privilegiada, createClient() si normal
    → mutación en Supabase
    → revalidatePath("/ruta-afectada")
    → retorna { success, error? }
  → Client muestra toast y actualiza UI local
```

### Middleware de autenticación (`middleware.ts`)

El middleware ejecuta en el Edge en cada request (excepto assets estáticos):
1. Lee el JWT de la cookie sin llamada HTTP (`getSession()`)
2. Valida contra Supabase Auth (`getUser()`)
3. Sin sesión + ruta protegida → `/login` (borra cookies `sb-*`)
4. Con sesión + ruta pública → `/dashboard`
5. `/sin-acceso` siempre accesible

```
matcher: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
```

---

## 5. Autenticación y sesión

### Función principal: `getCurrentUserContext()`

**Archivo:** `@/lib/current-user`
**Uso:** En **todo** Server Component que necesite saber quién es el usuario activo.

**Devuelve:**
```typescript
{
  id: string;
  email: string;
  fullName: string;
  role: "Administrador" | "Director" | "Responsable" | "Agente";
  empresaId: string;
  equipoId: string | null;
  avatarUrl: string | null;
  supervisorId: string | null;
  canDeleteZonas: boolean;
  canDeleteSectores: boolean;
  canDeleteFincas: boolean;
  canManageUsers: boolean;
  canViewAllAgents: boolean;
  canViewSupervisedAgents: boolean;
  supervisedAgentIds: string[];
}
```

### InactivityGuard

Componente en el layout `(crm)` que cierra la sesión automáticamente tras un período de inactividad configurable.

### Recuperación de contraseña

Flujo: `/recuperar` → email con enlace → `/nueva-contrasena?token=...` → actualización via Supabase Auth.

---

## 6. Modelo de datos (Supabase / PostgreSQL)

### Tablas principales

| Tabla | Descripción | Relaciones clave |
|-------|-------------|-----------------|
| `empresas` | Organización raíz (tenant) | Raíz del multi-tenant |
| `equipos` | Equipos dentro de una empresa | `empresa_id` → `empresas` |
| `usuarios` | Usuarios con rol, estado, supervisor | `empresa_id`, `equipo_id`, `supervisor_id` → `usuarios` |
| `zona` | Zonas geográficas | `empresa_id` |
| `sectores` | Sectores dentro de una zona | `zona_id` |
| `fincas` | Fincas dentro de un sector | `sector_id` |
| `propiedades` | Unidades inmobiliarias con estado y agente | `finca_id`, `agente_id` → `usuarios` |
| `pedidos` | Solicitudes/pedidos de clientes | `empresa_id`, `propietario_id` → `usuarios`. Tiene soft delete (`archived_at`). |
| `tareas` | Tareas del Kanban personal | `usuario_id`, columnas: `pendiente/orden_dia/realizado`. Tiene `created_at`, `updated_at`. |
| `agenda` | Eventos de calendario | `usuario_id`, sync con Google Calendar |
| `rendimiento` | Métricas mensuales por agente | `usuario_id`, `mes`, `año`, objetivos vs. real |
| `archivos` | Adjuntos y documentos | polimórfico: `entidad_tipo` + `entidad_id` |
| `configuracion_seguridad` | Contraseña de confirmación para borrados | `empresa_id` |
| `soporte_*` | Tickets de soporte interno | Múltiples tablas |

### Estados de propiedades

```
Noticia → Investigación → Encargo → Venta
```

### Multi-tenancy

Todas las queries deben filtrar por `empresa_id` del usuario actual. RLS en Supabase refuerza esto a nivel de base de datos.

### Tipos TypeScript

Importar siempre desde `@/types`:
```typescript
import type { Zona, Sector, Finca, Propiedad, Usuario, Pedido, Tarea, Agenda } from "@/types";
```

Los tipos de base están en `@/types/database.types.ts` (autogenerados con Supabase CLI — no editar manualmente).

### Regenerar tipos tras cambio de esquema

```bash
supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.types.ts
```

---

## 7. Roles y permisos

### Jerarquía

```
Administrador > Director > Responsable > Agente
```

| Rol | Capacidades |
|-----|------------|
| **Administrador** | Acceso total. Crea/elimina usuarios, gestiona zonas y configuración de seguridad. No puede ser eliminado ni cambiar de rol desde la UI. |
| **Director** | Ve todos los agentes de la empresa. Gestiona propiedades, rendimiento y pedidos. No gestiona usuarios. |
| **Responsable** | Gestiona sus agentes supervisados. Crea órdenes del día para ellos. Ve su propio rendimiento y el de supervisados. |
| **Agente** | Solo ve sus propias tareas, propiedades asignadas y su rendimiento individual. |

### Constante y helpers

```typescript
// @/lib/roles
export const USER_ROLES = ["Administrador", "Director", "Responsable", "Agente"] as const;
canManageUsers(role)          // solo Administrador
canDeleteZonas(role)          // Administrador + Director
canViewAllAgents(role)        // Administrador + Director
canViewSupervisedAgents(role) // Responsable
```

### Regla crítica: el Administrador es intocable

No se puede eliminar ni cambiar el rol de un Administrador desde la UI. Los helpers y las Server Actions ya lo protegen. **No romper esta invariante.**

---

## 8. Módulos de la aplicación

### Dashboard (`/dashboard`)

Pantalla principal con 4 secciones:
1. **SummaryCards** — Contadores: Noticias, Investigaciones, Encargos activos, Pedidos activos
2. **KanbanBoard** — Tablero personal drag & drop con `@hello-pangea/dnd`
3. **Orden del día** — Panel visible para Responsable y superiores
4. **Rendimiento del equipo** — Tabla comparativa de agentes + Agente del mes

### Zonas / Sectores / Fincas / Propiedades (`/zona`)

Navegación jerárquica con drill-down. CRUD completo con confirmación de contraseña para borrados.

### Solicitudes / Pedidos (`/solicitudes`)

CRUD de pedidos de clientes. Internamente la tabla se llama `pedidos`. **No mezclar los nombres en textos visibles.**

### Órdenes del día (`/ordenes`)

Tareas diarias con prioridad (Alta/Media/Baja) y estado. Responsables pueden crear órdenes para sus agentes supervisados.

### Calendario (`/calendario`)

Vista de agenda mensual/semanal con sincronización bidireccional Google Calendar (OAuth 2.0).

### Desarrollo / Rendimiento (`/desarrollo`)

Métricas por agente: facturado, encargos, ventas vs. objetivo. Editable por Directores y Responsables.

### Calculadora (`/calculadora`)

**Arquitectura modular** en `@/modules/calculator/`. 8 calculadoras + hub de herramientas.

Punto de entrada: `CalculatorDashboard` (orquestador, renderiza grid o calculadora activa).
Cada calculadora recibe `onSummaryChange?: (summary: string) => void` para notificar al padre.
La calculadora "simplificada" (`SimpleCommissionCalculator`) es la calculadora de comisión rápida.

Reglas del módulo:
- Las fórmulas viven en `formulas/` y son funciones puras sin React.
- Los componentes UI están en `components/`.
- La validación de forms usa Zod en `schemas/`.
- `number.ts` contiene `parseNumberInput` (formato español), `clamp`, `roundMoney`, `isValidNumberInput`, `isEmptyNumberInput`.
- Los resultados se muestran con `CalcHeroResult` + `CalcMetricTile` (ver sección "Sistema de calculadoras").
- Acciones comerciales: solo "Copiar resumen" funciona (clipboard API). Las demás (Guardar, Duplicar, Vincular, WhatsApp, PDF, Crear tarea) están en `CalculatorActions`.
- Los tests de fórmulas están en `src/__tests__/calculator-formulas.test.ts` (vitest).

### Usuarios (`/usuarios`)

Solo visible para Administrador: CRUD de usuarios, asignación de roles, relación supervisor→agente.

### Cuenta (`/cuenta`)

Perfil, avatar (upload a Supabase Storage), cambio de contraseña, confirmación para operaciones destructivas, vinculación Google Calendar.

### Soporte (`/soporte`)

Sistema de tickets internos. Tablas: `soporte_tickets`, `soporte_mensajes`.

---

## 8b. Sistema de calculadoras

### Componentes reutilizables (`src/modules/calculator/components/`)

| Componente | Descripción |
|-----------|-------------|
| `CalcSection` | Agrupa inputs relacionados bajo una etiqueta semántica. Cada fila interna se separa con `border-t`. |
| `CalcSliderInput` | Fila compacta label + input con adorno + slider opcional. Sin card propio — vive dentro de `CalcSection`. |
| `CalcHeroResult` | Card protagonista del resultado: valor grande, pill de estado semántico, barra de progreso opcional. |
| `CalcMetricTile` | Tile pequeño `bg-background` para métricas secundarias en un grid 2-col. |
| `CalculatorShell` | Envuelve cada calculadora: breadcrumb sutil (no card) + contenido + `CalculatorActions`. |

### Layout estándar

Grid `lg:grid-cols-[1.4fr_1fr]` con resultado a la derecha (sticky en desktop):

```tsx
<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
  {/* Resultado — mobile primero, desktop a la derecha */}
  <div className="order-first flex flex-col gap-3 lg:order-last lg:sticky lg:top-4 lg:self-start">
    <CalcHeroResult label="..." value="..." status="success|warning|danger|neutral" />
    <div className="grid grid-cols-2 gap-2">
      <CalcMetricTile label="..." value="..." />
    </div>
  </div>

  {/* Inputs — agrupados por contexto */}
  <div className="flex flex-col gap-4">
    <CalcSection label="La vivienda">
      <CalcSliderInput label="Precio" value={...} min={0} max={1000000} step={1000} prefix="€" onChange={...} />
    </CalcSection>
    <CalcSection label="La financiacion">...</CalcSection>
  </div>
</div>
```

### Hero metric obligatorio por calculadora

| Calculadora | Hero metric | Estado semántico |
|------------|-------------|-----------------|
| Comisión simplificada | Precio al comprador / Neto vendedor | `neutral` |
| Comprar vivienda | Cuota mensual (o total necesario si contado) | `viable/tight/not_viable` |
| Hipoteca | Cuota mensual | `viable/tight/not_viable` |
| Gastos de compraventa | Total gastos | `neutral` |
| Plusvalía municipal | Estimación plusvalía | `neutral` |
| Venta de vivienda | Neto para el propietario | `success/danger` según signo |
| Rentabilidad inversión | Rentabilidad neta % | `good/tight/weak` |
| Precio máximo comprador | Precio máximo recomendado | `neutral` |

### Reglas inviolables del módulo

- **Toda calculadora nueva debe seguir este patrón.** Prohibido volver a cards verticales por input.
- **Hero metric obligatorio.** Si no hay un número clave claro, replantearse si la calculadora tiene sentido.
- **No usar `NumericSliderField` directamente** en nuevas calculadoras. Usar `CalcSliderInput` dentro de `CalcSection`.
- **Tokens semánticos siempre.** Nunca `bg-white`, `text-gray-*`.

---

## 9. Clientes de Supabase — reglas de uso

**NUNCA mezcles los tres clientes. Usa el correcto según el contexto.**

| Archivo | Función exportada | Cuándo usar | Notas |
|---------|------------------|-------------|-------|
| `@/lib/supabase` | `createClient()` | **Server Components y Server Actions** | `async`. Lee cookies del request. RLS del usuario aplicado. |
| `@/lib/supabase-browser` | `createClient()` | **Client Components** | Síncrono. Envuelve en `useMemo` para no recrear. |
| `@/lib/supabase-admin` | `createAdminClient()` | **Server Actions privilegiadas** | Bypass RLS con `SUPABASE_SERVICE_ROLE_KEY`. Solo para: crear usuarios, leer datos de otras empresas, operaciones de admin. |

**Patrón cliente:**
```typescript
const supabase = useMemo(() => createClient(), []);
```

---

## 10. Patrones UI establecidos

### Estructura de página CRM estándar

```tsx
// page.tsx (Server Component)
<>
  <PageHeader title="Título" description="Descripción" />
  <ComponenteClient initialData={data} currentUserId={id} currentUserRole={role} />
</>
```

No envuelvas en cards adicionales. El `<main>` del AppShell ya tiene `p-4 md:p-6` y fondo.

### Card / sección base

```tsx
<div className="rounded-2xl border border-border bg-surface shadow-sm p-4">...</div>
```

**No anidar cards dentro de cards.**

### Tablas

```tsx
<table className="w-full text-sm">
  <thead className="bg-background">
    <tr><th className="text-left px-4 py-3 font-medium text-text-secondary">Columna</th></tr>
  </thead>
  <tbody className="divide-y divide-border">
    <tr className="hover:bg-background cursor-pointer">
      <td className="px-4 py-3">Dato</td>
    </tr>
  </tbody>
</table>
```

### Inputs

Usa la clase `.input` definida en `globals.css`. Aplica también a `<select>` y `<textarea>`.

### Modales

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
  <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl p-6">...</div>
</div>
```

### Toasts

```typescript
import { useToast } from "@/components/ui/toast";
const { toast } = useToast();
toast("Operación completada");           // success
toast("Ha ocurrido un error", "error");  // error
```

### Confirmación destructiva

- **Con contraseña:** `DeleteConfirmationDialog` + `verifyConfirmationPassword()`
- **Sin contraseña:** modal propio con botones. **Nunca uses `window.confirm`.**

### Avatares

```tsx
import Avatar from "@/components/ui/avatar";
<Avatar name={fullName} src={avatarUrl ?? undefined} size="md" />
```

### Iconos

```tsx
import { Plus, Search, MoreVertical, Trash2, Edit } from "lucide-react";
<Plus className="h-4 w-4" />
```

### Tokens de color (Tailwind)

**Usar siempre tokens semánticos. Nunca `bg-white`, `text-gray-*`, etc.**

| Token | Uso |
|-------|-----|
| `primary` | Color principal de la marca |
| `primary-dark` | Variante oscura del primario |
| `primary-light` | Variante clara del primario |
| `accent` | Ámbar — acciones secundarias |
| `success` | Verde — confirmaciones |
| `danger` | Rojo — errores y destructivos |
| `warning` | Amarillo — advertencias |
| `text-primary` | Texto principal |
| `text-secondary` | Texto secundario/muted |
| `background` | Fondo de página |
| `surface` | Fondo de cards/modales |
| `border` | Bordes |
| `muted` | Fondos sutiles |

**Dark mode:** activado con `html.dark`. Los tokens funcionan en ambos modos automáticamente.

---

## 11. Convenciones de código

- **Server Components por defecto.** `"use client"` solo cuando necesites estado, efectos, event listeners, drag & drop.
- **TypeScript estricto.** Cero `any` no justificados. Usa los tipos de `@/types`.
- **Naming:** archivos `kebab-case.tsx`, componentes `PascalCase`, helpers `camelCase`, constantes globales `UPPER_SNAKE_CASE`.
- **Sin comentarios** salvo casos genuinamente no obvios.
- **Imports agrupados:** 1. Externos, 2. `@/*`, 3. Relativos `./`.
- **Estructura página:** `page.tsx` (Server) + `*-client.tsx` (Client).
- **Mensajes de UI en español.** Precaución con tildes — revisar el contexto del archivo antes de introducir `á/é/í/ó/ú/ñ`.
- **`revalidatePath("/ruta")`** obligatorio tras toda mutación en Server Actions.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Incluye `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` cuando Claude hace el trabajo.

---

## 12. Integración Google Calendar

**Flujo OAuth 2.0:**
```
/cuenta → "Vincular Google" → GET /api/google/auth → redirect a Google
→ Google → GET /api/google/callback?code=... → tokens guardados en tabla `usuarios`
→ redirige a /calendario
```

**Sincronización:** `GET /api/google/sync` — sincroniza Google Calendar con tabla `agenda` (campo `google_event_id`).

**Scopes:** `https://www.googleapis.com/auth/calendar`
**Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_BASE_URL`

---

## 13. Seguridad

- JWT en cookies HTTP-only (`@supabase/ssr`)
- RLS en todas las tablas críticas
- Multi-tenant: filtrar siempre por `empresa_id`
- Cierre automático por inactividad (`InactivityGuard`)
- Contraseña de confirmación para operaciones destructivas (fallback `DELETE_CONFIRMATION_PASSWORD`)
- El Administrador es intocable
- OAuth 2.0 para Google — tokens en DB, no en cliente
- Middleware borra cookies `sb-*` al redirigir por falta de sesión

---

## 14. Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key        # Solo servidor. Nunca exponer al cliente.
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000            # URL base para callbacks OAuth
DELETE_CONFIRMATION_PASSWORD=password-fallback        # Fallback si no hay configuracion_seguridad

# WhatsApp — Proveedor activo (manual | meta | openwa). Default: manual
WHATSAPP_PROVIDER=manual
WHATSAPP_FALLBACK_PROVIDER=manual

# WhatsApp Cloud API (Meta) — solo si WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=

# OpenWA self-hosted — solo si WHATSAPP_PROVIDER=openwa
OPENWA_BASE_URL=http://localhost:2785/api
OPENWA_API_KEY=
OPENWA_DEFAULT_SESSION_NAME=metria-main
OPENWA_DEFAULT_SESSION_ID=
OPENWA_WEBHOOK_SECRET=
OPENWA_TIMEOUT_MS=10000
```

---

## 15. Comandos de desarrollo

```bash
cd metria
npm run dev              # Dev server en http://localhost:3000
npm run lint             # ESLint
npx tsc --noEmit         # Type-check (ejecutar con frecuencia)
npm run build            # Build de producción
npm start                # Iniciar servidor de producción

npx vitest run src/__tests__/calculator-formulas.test.ts  # Tests de fórmulas
npx vitest run          # Todos los tests

supabase db push                                                          # Aplicar migraciones
supabase gen types typescript --project-id PROJECT_ID > src/types/database.types.ts  # Regenerar tipos
```

---

## 16. Gotchas y trampas frecuentes

1. **Renombrar carpetas ≠ actualizar contenido.** Si renombras `pedidos/` → `solicitudes/`, cambia también los textos visibles (`<h1>`, toasts, botones, sidebar, breadcrumbs).

2. **El Administrador es intocable.** No implementes UI que permita eliminar o cambiar el rol de un Administrador.

3. **`revalidatePath` obligatorio.** Toda Server Action que mute datos debe llamar `revalidatePath("/ruta-afectada")`.

4. **Migraciones con formato correcto.** `supabase/migrations/YYYYMMDD_descripcion.sql`. Si modificas el esquema, regenera `src/types/database.types.ts`.

5. **No introduzcas dependencias nuevas** sin consenso.

6. **Tres clientes de Supabase — no los mezcles.** Ver sección 9.

7. **Tokens de color, nunca hardcoded.** No uses `bg-white`, `text-gray-500`, `border-gray-200`, etc. Rompen el dark mode.

8. **`useMemo` para el cliente browser.** En Client Components: `const supabase = useMemo(() => createClient(), [])`.

9. **`window.confirm` prohibido.** Usa modales propios o `DeleteConfirmationDialog`.

10. **La ruta interna de solicitudes es `pedidos` en DB.** La URL de la UI es `/solicitudes` pero la tabla se llama `pedidos`. No confundir.

11. **Sidebar y permisos de navegación.** Si añades una nueva ruta protegida, actualiza el sidebar (`@/components/layout/sidebar.tsx`) con la restricción de rol correspondiente.

12. **Avatar determinista.** El componente `Avatar` genera un color de fondo basado en el nombre del usuario. No pases colores manuales.

13. **Calculadora: `NumericSliderField` sincroniza `draft` con `value`.** El estado `draft` interno se resetea automáticamente cuando la prop `value` cambia externamente (via `useEffect`). Al refactorizar, mantener esta sincronización.

14. **Calculadora: fuente de verdad única.** `SimpleCommissionCalculator` usa un único estado `commissionText` para el input de comisión. No duplicar con `commissionDraft`. La validación se hace con `isValidNumberInput()` y errores se muestran con `commissionError` + borde `border-danger`.

---

## 17. Changelog

> Actualiza esta sección cada vez que hagas cambios significativos al proyecto.
> Formato: `YYYY-MM-DD — [tipo] descripción breve`

| Fecha | Tipo | Descripción |
|-------|------|-------------|
| 2026-05-17 | `fix` | Calculadora simplificada: corregido draft atascado en NumericSliderField, eliminado commissionDraft duplicado, añadida validación isValidNumberInput con feedback visual de error |
| 2026-05-17 | `test` | Añadidos tests de isValidNumberInput, parseNumberInput edge cases y 4 escenarios de comisión (300k/3%/IVA, 400k/5%/IVA, 500k/10%/noIVA, final→neto) |
| 2026-05-17 | `docs` | Creación del CLAUDE.md técnico completo con análisis profundo del proyecto |
| 2026-05-17 | `docs` | Ampliada documentación del módulo calculadora (arquitectura, patrones, gotchas) |
| 2026-05-17 | `feat` | Rediseño premium de la toolbar de zonas geográficas: glassmorphism, segmented control, microinteracciones, responsive |
| 2026-05-18 | `feat` | Integración OpenWA: capa de proveedores WhatsApp (manual/meta/openwa), cliente HTTP OpenWA, endpoints internos, webhook con idempotencia y firma HMAC, migraciones whatsapp_sessions y whatsapp_webhook_events, documentación |
| 2026-05-18 | `feat` | Rediseño del sistema de calculadoras: layout grid 1.4fr/1fr con hero metric, nuevos componentes CalcSection/CalcSliderInput/CalcHeroResult/CalcMetricTile, eliminados cards verticales por input, CalculatorShell simplificado a breadcrumb. Documentado en sección 8b. |
| 2026-05-20 | `feat` | Calendario: filtro por usuarios refactorizado a multi-select. Nuevo componente `UserMultiFilter.tsx` (dropdown con checkboxes, búsqueda, chips, botón limpiar). Estado cambiado de `filterUserId: number\|"all"` a `filterUserIds: Set<number>`. Agente ve badge "Mis tareas" en lugar de filtro. Seguridad sin cambios: datos ya limitados por RLS y filtro JS en server. |
| 2026-05-20 | `feat` | Dashboard: nueva fase "Seguimiento" entre Investigaciones y Encargos. Añadido a `SummaryData`, `DashboardWorkspace` (`MetricKey`, `buildMetricCards`, `METRIC_ACCENT`, grid 5 cols), queries de count y listing en `page.tsx`. DB y constantes ya tenían el estado; solo faltaba la UI. |
| 2026-05-20 | `chore` | Auditoría BD: migración `20260520000002_performance_audit.sql`. Añade `created_at`/`updated_at` + trigger a `tareas`; `created_at`/`updated_at`/`archived_at` + trigger a `pedidos` (soft delete). 25 índices nuevos en propiedades, usuarios, pedidos, tareas, agenda, fincas/sectores, zona_acceso, actividad_desarrollo. Función genérica `set_updated_at()`. |
| 2026-05-20 | `fix` | Calendario: corrección visibilidad eventos por rol (Responsable/Agente veían todos los eventos de empresa). Añadido `allowedUserIdsSet` + `isEventAllowed()` aplicado en `serverEvents`/`serverTareas` post-fetch. Agente también pasa `assignedUserId` a `useTasks` para restricción DB. |
| 2026-05-20 | `chore` | Integración react-doctor v0.2.1: `react-doctor.config.json`, scripts `doctor*` en package.json, workflow `.github/workflows/react-doctor.yml` (phase 1 informativo, fail-on:none), `docs/dev/react-doctor.md` con diagnóstico inicial y plan de corrección. |
| 2026-05-22 | `feat` | Backups Fase 8 — Restore selectivo y productivo controlado: `backupRestoreExecutionService` con `activateMaintenanceMode`/`deactivateMaintenanceMode` (tabla `system_maintenance`), `createPreRestoreBackup` (backup full síncrono previo), `restoreEntityFromBackup` (descarga JSONL.gz desde Storage, descomprime, upsert por lotes de 50, filtro empresa_id, omite tombstones y campos redactados), `executeProductionRestore` (orquestador completo: pre-backup→maintenance→restore por entidad→verify→deactivate); flujo de aprobación en `backupRestoreService`: `requestProductionRestore`/`approveProductionRestore` (anti-autoaprobación)/`rejectProductionRestore`/`cancelRestore`; 6 nuevas server actions; `RestoreWizard` reescrito con modo Sandbox y modo Produccion (tabs separados), 4 pasos en producción (entidades→solicitar→aprobacion→confirmar con "RESTAURAR PRODUCCION"→resultado), modo produccion bloqueado hasta sandbox exitoso, tabla de resultados por entidad, verificación posterior visible. |
| 2026-05-22 | `feat` | Backups Fase 7 — Restore en sandbox: tipos `RestoreRun`, `DryRunReport`, `DryRunValidation`, `EntityImpact`; `backupRestoreService` reescrito con `executeDryRunAnalysis` (7 validaciones previas, análisis de conflictos por entidad via `updated_at`, acceso a Storage, validación de cadena incremental), `startDryRun` (crea restore_run, ejecuta análisis, persiste informe, audita), `listRestoreRuns`; 3 nuevas server actions (`startDryRunAction`, `getRestoreRunAction`, `listRestoreRunsAction`); `RestoreWizard` reescrito — wizard 3 pasos (seleccionar→analizar→informe) con badges de tipo/fase, validaciones visibles, tabla de impacto por entidad, estimación de conflictos, estado de Storage, aviso permanente "solo simulacion", producción marcada como no disponible. |
| 2026-05-22 | `feat` | Backups Fase 6 — Retención y limpieza segura: migración `20260522130000` añade `locked_by`, `expired_at`, `expired_by`, `expiration_reason` a `backup_runs` + tabla `backup_retention_config` con RLS; `RetentionPolicy`/`RetentionCandidate`/`RetentionCleanupResult` en tipos; `backupRetentionService` con `getRetentionConfig`, `saveRetentionConfig`, `lockBackup`, `unlockBackup`, `getRetentionCandidates` (7 reglas de protección), `runRetentionCleanup` (dry_run por defecto, borrado lógico `status=expired`); `backupRetentionCleanupJobHandler` siempre dry-run automatizado; schedule diario a las 04:00; 6 nuevas server actions (lock/unlock/preview/execute/save-config); `BackupRetentionEditor` reemplazado — editable, preview interactivo, confirmación de cleanup con contador; `BackupHistoryTable` añade botones lock/unlock con modal de motivo; `BackupsDashboard` propaga `retentionPolicy`; `page.tsx` carga config de retención. |
| 2026-05-22 | `feat` | Backups Fase 4 — Incrementales reales: migración añade `base_full_backup_id` a `backup_runs` + índices de cadena; `backupChangeLogService` con `recordBackupChange`/`getUnprocessedChanges`/`markChangesAsProcessed`/`groupChangesByEntity`; `backupChainService` con `validateBackupChain` (recorre cadena entera hasta el full base), `getIncrementalWindow`; `backupExportService` añade `exportIncrementalEntities` (detecta cambios via `updated_at` por entidad, tombstones para eliminados desde change_log, cobertura parcial si tabla sin updated_at); `executeBackupRun` bifurcado full vs incremental con validación de cadena; marcado de cambios procesados SOLO tras verificación exitosa; bug corregido: `parent_backup_id` y `base_full_backup_id` ahora se asignan al crear runs incrementales; scheduler valida cadena y bloquea incrementales sin full base; `BackupHistoryTable` muestra icono de rama, ventana from/to, cadena válida/rota, cobertura, tabla de cambios capturados. |
| 2026-05-22 | `feat` | Backups Fase 5 — Backup real de Storage: `backupStorageBuckets.ts` config de 2 buckets (`encargo-archivos` via tabla `archivos`, `avatars` via tabla `usuarios`); `backupStorageExportService.ts` descarga objetos bucket a bucket hacia `backups-privado` en batches de 50, con checksum SHA256 por objeto, `storage_manifest.json`, registro en `backup_artifacts`; `executeBackupRun` integra paso `exporting_storage` + 2 integrity checks; `BackupManifest.storage` incluye `bucket_details` con desglose por bucket; `BackupRunDetails` muestra sección Storage con objetos/tamaño/estado por bucket; multiempresa garantizada: `encargo-archivos` filtrado por `empresa_id` en tabla `archivos`, `avatars` filtrado por user IDs de la empresa. |
| 2026-05-22 | `feat` | Backups Fase 3 — Backup real de datos: `backupExportService` exporta entidades a JSONL.gz paginado (500 filas/batch) con redacción de campos sensibles, checksum SHA256 por archivo, upload a Supabase Storage bucket `backups-privado`; `backupStorageService` gestiona bucket y rutas; `sensitiveFields.ts` lista central de campos a redactar; `backupEntities.ts` ampliado con `priority`, `companyField`, `redactFields`; `executeBackupRun` produce export real + `schema.json` + `checksums.sha256` + 6 integrity checks; `BackupManifest` extendido con `entities`, `database_export`, `storage_export`, `restore_status`, `warnings`, `errors`, `phase`; `BackupRunDetails` muestra tabla de entidades con filas/tamaño/estado; UI distingue Completo/Parcial/Fallido para DB export; Storage y Restore siguen marcados honestamente como pendiente/solo-simulacion. |
| 2026-05-22 | `feat` | Backups Fase 2 — Automatizaciones reales: `calculateNextBackupRun` con soporte hourly/every_x_hours/daily/weekly/monthly y timezone; `processDueProfiles` scheduler con protección anti-duplicado; handler `backup.schedule_due` registrado cada 5 min; CRUD completo de `BackupProfile` (create/update/toggle/duplicate/delete) con server actions; migración `20260522100000` añade `last_run_at`, `next_run_at`, `last_status`, `max_retries`, `retry_delay_minutes`; UI: `BackupProfilesList` con acciones, `BackupProfileForm` completo, `BackupScheduleEditor`, `BackupNextRunPreview`, `BackupProfileStatusBadge`; aviso honesto de Fase 1 en UI. |
| 2026-05-20 | `fix` | Responsive móvil — auditoría e implementación: (1) Bug crítico sidebar: `--sidebar-width` aplicaba 260px en móvil; corregido con `.sidebar-content-wrapper` CSS (media query `md+`). (2) Dashboard `ListingTable`: card view en `< md`, tabla en `md+`. (3) Solicitudes: card view móvil con teléfono/WA/presupuesto, tabla en `md+`; grids de formulario corregidos (`grid-cols-1 sm:grid-cols-X`). (4) Propiedades: view por defecto `cards` en móvil, `table` en desktop. (5) Auth shell: padding compacto en móvil (`p-5 sm:p-8`). (6) Bulk-send bar: `bottom-20 md:bottom-6` para no solapar con bottom nav. |
