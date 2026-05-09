/**
 * Central sync engine: connects the event bus to TanStack Query.
 *
 * Each event type maps to a set of query-key invalidation rules.
 * The engine subscribes to all events and triggers the right cache
 * operations so every active view refreshes automatically.
 *
 * Rules are intentionally listed here — adding a new cross-view
 * side-effect means editing ONE file instead of hunting across hooks.
 */

import type { QueryClient } from "@tanstack/react-query";
import { eventBus } from "./event-bus";
import { queryKeys } from "./query-keys";
import type {
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskCompletedPayload,
  TaskDeletedPayload,
  TaskMovedPayload,
  CalendarEventCreatedPayload,
  CalendarEventUpdatedPayload,
  CalendarEventCompletedPayload,
  CalendarEventDeletedPayload,
  OrderUpdatedPayload,
  PropertyUpdatedPayload,
  ContactUpdatedPayload,
  UserUpdatedPayload,
  ZonaUpdatedPayload,
  SolicitudUpdatedPayload,
} from "./events";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inv(qc: QueryClient, ...keys: ReturnType<typeof queryKeys[keyof typeof queryKeys][keyof (typeof queryKeys)[keyof typeof queryKeys]]>[]) {
  keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
}

// ─── Engine initializer ───────────────────────────────────────────────────────

/**
 * Call once when the CRM layout mounts. Returns a cleanup function.
 *
 * The engine does NOT duplicate optimistic-update logic — those live in the
 * mutation hooks. The engine only handles confirmed-state synchronization
 * between views after a mutation settles.
 */
export function initSyncEngine(qc: QueryClient): () => void {
  const unsubs: Array<() => void> = [];

  // ── Tasks ────────────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("task.created", (_p: TaskCreatedPayload) => {
      // New task appears in kanban, ordenes del día, and notifications
      inv(qc,
        queryKeys.kanban.all(),
        queryKeys.ordenes.all(),
        queryKeys.tareas.all(),
        queryKeys.notifications.all(),
      );
    })
  );

  unsubs.push(
    eventBus.on("task.updated", (_p: TaskUpdatedPayload) => {
      // Field changes show up in kanban cards and ordenes
      inv(qc,
        queryKeys.kanban.all(),
        queryKeys.ordenes.all(),
        queryKeys.tareas.all(),
      );
    })
  );

  unsubs.push(
    eventBus.on("task.completed", (_p: TaskCompletedPayload) => {
      // Completion removes from kanban/ordenes, closes notification badge
      inv(qc,
        queryKeys.kanban.all(),
        queryKeys.ordenes.all(),
        queryKeys.tareas.all(),
        queryKeys.notifications.all(),
      );
    })
  );

  unsubs.push(
    eventBus.on("task.deleted", (_p: TaskDeletedPayload) => {
      inv(qc,
        queryKeys.kanban.all(),
        queryKeys.ordenes.all(),
        queryKeys.tareas.all(),
        queryKeys.notifications.all(),
      );
    })
  );

  unsubs.push(
    eventBus.on("task.moved", (_p: TaskMovedPayload) => {
      // Moving between columns syncs kanban + ordenes
      inv(qc,
        queryKeys.kanban.all(),
        queryKeys.ordenes.all(),
        queryKeys.tareas.all(),
      );
    })
  );

  // ── Calendar events ───────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("calendar.event.created", (_p: CalendarEventCreatedPayload) => {
      // New activity shows in calendar, ordenes del día, and dashboard kanban
      inv(qc,
        queryKeys.agenda.all(),
        queryKeys.kanban.all(),
        queryKeys.ordenes.all(),
      );
    })
  );

  unsubs.push(
    eventBus.on("calendar.event.updated", (_p: CalendarEventUpdatedPayload) => {
      // Edits propagate to calendar and ordenes (date change moves between days)
      inv(qc,
        queryKeys.agenda.all(),
        queryKeys.ordenes.all(),
        queryKeys.kanban.all(),
      );
    })
  );

  unsubs.push(
    eventBus.on("calendar.event.completed", (_p: CalendarEventCompletedPayload) => {
      inv(qc,
        queryKeys.agenda.all(),
        queryKeys.ordenes.all(),
        queryKeys.kanban.all(),
      );
    })
  );

  unsubs.push(
    eventBus.on("calendar.event.deleted", (_p: CalendarEventDeletedPayload) => {
      inv(qc,
        queryKeys.agenda.all(),
        queryKeys.ordenes.all(),
        queryKeys.kanban.all(),
      );
    })
  );

  // ── Ordenes del día ───────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("order.updated", (p: OrderUpdatedPayload) => {
      // Targeted: only the affected day + cross-view kanban
      qc.invalidateQueries({ queryKey: queryKeys.ordenes.day(p.date, p.userId) });
      qc.invalidateQueries({ queryKey: queryKeys.kanban.all() });
      qc.invalidateQueries({ queryKey: queryKeys.tareas.all() });
    })
  );

  // ── Properties ───────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("property.updated", (p: PropertyUpdatedPayload) => {
      // Invalidate list + specific detail
      qc.invalidateQueries({ queryKey: queryKeys.propiedades.all() });
      qc.invalidateQueries({ queryKey: queryKeys.propiedades.detail(p.propiedadId) });
      // Pipeline suggestions re-evaluate on property changes
      qc.invalidateQueries({ queryKey: queryKeys.kanban.all() });
    })
  );

  // ── Contacts ─────────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("contact.updated", (p: ContactUpdatedPayload) => {
      qc.invalidateQueries({ queryKey: queryKeys.contactos.all() });
      qc.invalidateQueries({ queryKey: queryKeys.contactos.detail(p.contactoId) });
    })
  );

  // ── Users ─────────────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("user.updated", (_p: UserUpdatedPayload) => {
      qc.invalidateQueries({ queryKey: queryKeys.usuarios.all() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    })
  );

  // ── Zones ─────────────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("zona.updated", (p: ZonaUpdatedPayload) => {
      qc.invalidateQueries({ queryKey: queryKeys.zonas.all() });
      qc.invalidateQueries({ queryKey: queryKeys.zonas.detail(p.zonaId) });
    })
  );

  // ── Solicitudes ───────────────────────────────────────────────────────────

  unsubs.push(
    eventBus.on("solicitud.updated", (p: SolicitudUpdatedPayload) => {
      qc.invalidateQueries({ queryKey: queryKeys.solicitudes.all() });
      qc.invalidateQueries({ queryKey: queryKeys.solicitudes.detail(p.pedidoId) });
    })
  );

  // ── Cleanup ───────────────────────────────────────────────────────────────

  return () => unsubs.forEach((fn) => fn());
}
