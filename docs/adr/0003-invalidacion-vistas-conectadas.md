# ADR 0003: Invalidacion de vistas conectadas

## Estado
Aceptado

## Contexto
Una accion en Metria puede afectar varias vistas. Completar una tarea impacta dashboard, kanban, orden del dia y notificaciones. Crear una actividad impacta agenda, calendario y orden del dia. Necesitamos una forma consistente de sincronizar caches sin acoplar componentes entre si.

## Decision
Las mutaciones emitiran eventos de dominio y el `sync-engine` mapeara esos eventos a invalidaciones de TanStack Query. Las invalidaciones cross-view deben vivir en un punto central.

## Consecuencias positivas
- Las vistas se actualizan sin recargar la pagina.
- Los componentes no necesitan conocer todas las pantallas afectadas.
- El mapa de efectos colaterales queda auditable.
- Permite optimistic updates locales y refetch confirmado despues.

## Trade-offs
- El event bus es una capa adicional que hay que mantener.
- Invalidar por prefijos amplios es seguro, pero puede ser costoso.
- Si una mutation no emite evento, las vistas conectadas pueden quedar desactualizadas.

## Reglas practicas
- Toda mutation que cambie agenda, tareas, kanban, contactos o usuarios debe emitir evento o invalidar explicitamente.
- Optimistic update solo debe actualizar la cache local afectada.
- La sincronizacion entre vistas vive en `sync-engine`.
- Preferir invalidaciones especificas cuando el payload tenga suficiente contexto.
- Mantener nombres de eventos en lenguaje de dominio: `task.completed`, `calendar.event.updated`.

## Ejemplos de uso correcto
```ts
eventBus.emit({
  type: "task.completed",
  payload: { tareaId, source: "kanban" },
});
```

```ts
qc.invalidateQueries({ queryKey: queryKeys.ordenes.day(date, userId) });
qc.invalidateQueries({ queryKey: queryKeys.kanban.all() });
```

## Antipatrones a evitar
- Invalidar caches desde muchos componentes distintos.
- Hacer `window.location.reload()` para sincronizar vistas.
- Mezclar optimistic update cross-view con datos parciales inseguros.
- Emitir eventos genericos como `data.changed`.
- Olvidar rollback en optimistic updates.
