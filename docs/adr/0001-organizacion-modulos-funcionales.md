# ADR 0001: Organizacion de modulos funcionales

## Estado
Aceptado

## Contexto
Metria es un CRM inmobiliario con dashboard, agenda, tareas, kanban, contactos, permisos y Supabase. El codigo ya mezcla rutas de Next.js, componentes, hooks, queries y logica de negocio. Necesitamos escalar sin mover pantallas grandes de golpe.

## Decision
Organizaremos el dominio en modulos funcionales bajo `src/modules`. Las rutas en `src/app` seran capa de routing y composicion, no el lugar principal para logica de negocio.

Modulos objetivo:
- `modules/dashboard`
- `modules/agenda`
- `modules/tareas`
- `modules/kanban`
- `modules/contactos`
- `modules/shared`

Cada modulo puede tener:
- `components/`
- `hooks/`
- `services/`
- `schemas/`
- `types.ts`
- `query-keys.ts`
- `mutations.ts`

## Consecuencias positivas
- Hace mas facil localizar codigo por dominio.
- Reduce componentes grandes con demasiadas responsabilidades.
- Permite migraciones graduales sin romper rutas.
- Facilita ownership tecnico por modulo.

## Trade-offs
- Durante la migracion conviviran estructuras antiguas y nuevas.
- Habra reexports o adaptadores temporales.
- Algunas decisiones de naming, como `agenda` vs `calendario`, deberan estabilizarse poco a poco.

## Reglas practicas
- `src/app` compone paginas, carga contexto inicial y delega en modulos.
- `components/` contiene UI del modulo.
- `hooks/` contiene TanStack Query y adaptadores para UI.
- `services/` contiene acceso a Supabase/RPC y transformaciones de datos.
- `schemas/` contiene Zod.
- `types.ts` contiene tipos del dominio.
- `query-keys.ts` contiene factories de cache keys.
- `mutations.ts` contiene contratos y eventos de mutacion.
- Un modulo no debe importar desde `src/app`.

## Ejemplos de uso correcto
```ts
import { useAgendaRange } from "@/modules/agenda/hooks/use-agenda-range";
import { AgendaCalendar } from "@/modules/agenda/components/AgendaCalendar";
```

```ts
// src/app/(crm)/calendario/page.tsx
export default async function Page() {
  return <AgendaPage />;
}
```

## Antipatrones a evitar
- Poner queries Supabase complejas dentro de componentes de pagina.
- Mover pantallas grandes solo para "ordenar carpetas".
- Crear `modules/shared` como cajon de sastre.
- Importar componentes de `app/(crm)` desde `modules`.
- Crear abstracciones genericas tipo `BaseRepository` antes de necesitarlas.
