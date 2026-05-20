# ADR 0002: Zustand vs TanStack Query

## Estado
Aceptado

## Contexto
Metria necesita sincronizar dashboard, agenda, tareas, kanban y contactos. Tambien necesita estado global de UI como sidebar, panel lateral, filtros, modales y seleccion activa. Mezclar ambos tipos de estado genera datos duplicados y bugs de sincronizacion.

## Decision
TanStack Query sera la fuente para server state. Zustand sera la fuente para UI/client state compartido.

## Consecuencias positivas
- Evita duplicar datos remotos en stores globales.
- Centraliza cache, refetch, stale time, optimistic updates e invalidaciones.
- Mantiene Zustand pequeno, rapido y predecible.
- Reduce estados desincronizados entre vistas.

## Trade-offs
- Algunas pantallas deberan migrar gradualmente desde `useState` local a queries/mutations.
- Hay que distinguir con disciplina entre estado remoto y estado de interfaz.
- TanStack Query requiere convenciones claras de query keys.

## Reglas practicas
- Listas remotas viven en TanStack Query: agenda, tareas, kanban, contactos, usuarios.
- Mutaciones remotas viven en TanStack Query o server actions llamadas desde hooks.
- Zustand puede guardar sidebar, panel activo, modal abierto, filtros, seleccion y preferencias UI.
- Zustand no debe guardar copias completas de tablas Supabase.
- El estado local con `useState` sigue siendo valido para formularios pequenos o UI aislada.

## Ejemplos de uso correcto
```ts
const { data: tareas } = useTareasList(params);
```

```ts
const sidebarOpen = useSidebarOpen();
const toggleSidebar = useSidebarToggle();
```

```ts
const filters = useOrdenesFilters();
const query = useOrdenes({ date: filters.date, userId });
```

## Antipatrones a evitar
- Guardar `agenda[]` o `contactos[]` en Zustand.
- Actualizar manualmente varias vistas despues de una mutation.
- Usar Zustand para reemplazar cache de TanStack Query.
- Pasar objetos de filtros inestables como query keys sin normalizarlos.
- Crear Redux Toolkit mientras Zustand cubra el caso de UI state.
