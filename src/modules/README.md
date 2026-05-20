# Arquitectura de Módulos

Cada módulo agrupa todo lo relacionado con un dominio: componentes UI, servicios (queries/lógica de negocio) y hooks.

## Estructura por módulo

```
modules/
  [feature]/
    components/   UI específico del dominio (Client y Server Components)
    services/     Lógica de negocio, queries Supabase, utilidades de dominio
    hooks/        React hooks específicos del dominio (vacío si no aplica)
```

## Módulos

| Módulo | Descripción |
|---|---|
| `dashboard` | Kanban, métricas resumen, oportunidades, sugerencias de pipeline |
| `calendario` | Eventos de agenda, normalización de Google Calendar |
| `soporte` | Tickets de soporte y mensajería |
| `empresa` | Organigrama y estructura de equipos |
| `email` | Integración Gmail, envío, linking con entidades |
| `matching` | Motor de matching propiedades ↔ pedidos |
| `propiedades` | Encargos, validación para web |
| `zonas-geograficas` | Zonas geográficas, tipos y acciones |
| `colaboraciones` | Panel de colaboraciones entre agentes |
| `contactos` | Timeline de contacto |
| `cuenta` | Perfil de usuario, avatar |
| `documents` | Generador de documentos, plantillas |
| `hoy` | Vista diaria, queries y tipos |
| `desarrollo` | Métricas de rendimiento por agente |
| `solicitudes` | (reservado para componentes futuros de solicitudes) |
| `ordenes` | (reservado para componentes futuros de órdenes) |
| `usuarios` | (reservado para componentes futuros de usuarios) |

## Lo que NO está en módulos

- `/components/ui` — Design system compartido (Avatar, Toast, Modal, etc.)
- `/components/layout` — AppShell, Sidebar, Header, PageHeader
- `/components/auth` — AuthShell
- `/lib` — Supabase clients, auth helpers, roles, i18n, validaciones, access-control
- `/hooks` — Hooks React verdaderamente reutilizables entre módulos
- `/services` — Queries Supabase reutilizadas entre múltiples módulos
- `/types` — Tipos globales (database.types.ts, aliases de dominio)
