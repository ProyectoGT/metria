# Metria CRM

CRM inmobiliario desarrollado para **Master Iberica**. Gestiona propiedades, agentes, clientes y el pipeline de ventas desde una sola plataforma.

---

## Descripción general

Metria es una aplicación web SaaS en español que centraliza la operativa de una agencia inmobiliaria:

- Organización jerárquica del territorio: **Zonas → Sectores → Fincas → Propiedades**
- Seguimiento del ciclo de vida de cada propiedad (Noticia → Investigación → Encargo → Venta)
- Gestión de pedidos de clientes y encargos de venta
- Tablero Kanban personal de tareas para cada agente
- Control de rendimiento mensual y anual por agente
- Integración con Google Calendar para agenda y citas
- Control de acceso basado en roles (Administrador, Director, Responsable, Agente)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| UI | React 19 + Tailwind CSS 4 |
| Lenguaje | TypeScript 5 |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth + JWT en cookies HTTP-only |
| Drag & drop | @hello-pangea/dnd |
| Iconos | Lucide React |
| Integración externa | Google Calendar (OAuth 2.0) |

---

## Estructura del proyecto

```
metria/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login y recuperación de contraseña
│   │   ├── (crm)/               # Rutas protegidas del CRM
│   │   │   ├── dashboard/       # Resumen general y Kanban
│   │   │   ├── zona/            # Zonas → Sectores → Fincas → Propiedades
│   │   │   ├── propiedades/     # Listado y encargos
│   │   │   ├── solicitudes/     # Pedidos de clientes
│   │   │   ├── ordenes/         # Órdenes del día
│   │   │   ├── calendario/      # Agenda y Google Calendar
│   │   │   ├── desarrollo/      # Métricas y objetivos por agente
│   │   │   ├── calculadora/     # Calculadoras inmobiliarias
│   │   │   ├── usuarios/        # Gestión de usuarios (admin)
│   │   │   └── cuenta/          # Perfil y seguridad
│   │   └── api/
│   │       └── google/          # OAuth y sincronización Google Calendar
│   ├── components/
│   │   ├── layout/              # AppShell, Sidebar, Header
│   │   ├── dashboard/           # KanbanBoard, SummaryPanel, rendimiento
│   │   ├── cuenta/              # Perfil, avatar
│   │   ├── propiedades/         # EncargoPanel
│   │   └── ui/                  # Componentes reutilizables (toast, dialog…)
│   ├── lib/                     # Clientes Supabase, permisos, utilidades
│   └── types/                   # Tipos TypeScript globales
├── supabase/
│   └── migrations/              # Migraciones de base de datos
├── middleware.ts                 # Protección de rutas (auth)
└── .env.local.example           # Variables de entorno requeridas
```

---

## Módulos principales

### Dashboard
Pantalla de inicio con:
- Tarjetas resumen: Noticias, Investigaciones, Encargos, Pedidos activos
- Tablero Kanban personal con drag & drop: **Pendientes → Orden del día → Realizado**
- Panel "Orden del día" (visible para Responsable y superiores)
- Agente del mes y tabla de rendimiento del equipo
- Panel "Mi actividad" para agentes

### Zonas / Sectores / Fincas / Propiedades
Navegación jerárquica del territorio con drill-down. Cada nivel permite crear, editar y eliminar sus elementos. Las propiedades tienen estados propios del ciclo inmobiliario y pueden asignarse a un agente.

### Solicitudes (Pedidos)
Registro de peticiones de clientes: tipo de propiedad buscada, zona deseada, propietario de la solicitud.

### Órdenes del día
Gestión de tareas diarias con prioridad (Alta / Media / Baja), fecha y estado. Los responsables pueden crear órdenes para sus agentes.

### Calendario
Vista de agenda integrada con Google Calendar mediante OAuth 2.0. Los eventos se sincronizan con la tabla `agenda` de Supabase.

### Desarrollo (Rendimiento)
Seguimiento mensual y anual de métricas por agente:
- Facturado vs. objetivo
- Encargos vs. objetivo
- Ventas vs. objetivo
- Contactos vs. objetivo

Editable por directores y responsables.

### Calculadora
Herramientas de cálculo inmobiliario (comisiones, rentabilidades, etc.).

### Usuarios
Panel de administración para crear usuarios, asignar roles y gestionar la relación supervisor–agente.

### Cuenta
Configuración personal: datos de perfil, avatar, seguridad (contraseña de confirmación para operaciones sensibles) y vinculación con Google.

---

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| **Administrador** | Acceso total. Gestión de usuarios, zonas, configuración de seguridad |
| **Director** | Puede ver todos los agentes, gestionar propiedades y rendimiento |
| **Responsable** | Gestiona sus agentes supervisados, sus tareas y propiedades |
| **Agente** | Solo ve sus propias tareas, propiedades asignadas y su rendimiento |

La seguridad se aplica tanto en el frontend (navegación) como en la base de datos mediante políticas de Row-Level Security (RLS) en Supabase.

---

## Modelo de datos principal

| Tabla | Descripción |
|-------|------------|
| `usuarios` | Cuentas de usuario con rol, estado y supervisor |
| `empresas` | Organización raíz |
| `equipos` | Equipos dentro de la empresa |
| `zona` | Zonas geográficas |
| `sectores` | Sectores dentro de una zona |
| `fincas` | Fincas dentro de un sector |
| `propiedades` | Propiedades individuales con estado y agente asignado |
| `pedidos` | Solicitudes de clientes |
| `tareas` | Tareas del Kanban personal |
| `agenda` | Eventos del calendario |
| `rendimiento` | Métricas mensuales por agente |
| `archivos` | Adjuntos y documentos |
| `configuracion_seguridad` | Contraseña de confirmación para borrados |

---

## Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena los valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar en producción
npm start
```

La aplicación estará disponible en `http://localhost:3000`.

Para aplicar las migraciones de base de datos, utiliza la CLI de Supabase:

```bash
supabase db push
```

---

## Seguridad

- Sesiones gestionadas con JWT en cookies HTTP-only
- Cierre de sesión automático por inactividad
- Contraseña de confirmación configurable para operaciones destructivas (borrado de zonas, fincas, etc.)
- RLS en todas las tablas críticas
- OAuth 2.0 para integración con Google (solo lectura de calendario)
