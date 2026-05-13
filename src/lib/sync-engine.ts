/**
 * Central sync engine: connects domain events to TanStack Query invalidations.
 *
 * Cross-view invalidation belongs here so components and hooks do not need to
 * know every screen affected by a mutation.
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { eventBus } from "./event-bus";
import { queryKeys } from "./query-keys";
import type {
  ContactUpdatedPayload,
  OrderUpdatedPayload,
  PropertyUpdatedPayload,
  SolicitudUpdatedPayload,
  ZonaUpdatedPayload,
} from "./events";

function inv(qc: QueryClient, ...keys: QueryKey[]) {
  keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
}

function invalidateTaskViews(qc: QueryClient) {
  inv(
    qc,
    queryKeys.tasks.all(),
    queryKeys.tareas.all(),
    queryKeys.today.all(),
    queryKeys.ordenes.all(),
    queryKeys.kanban.all(),
    queryKeys.dashboard.summary.all(),
    queryKeys.dashboard.nextActions.all(),
    queryKeys.notifications.all()
  );
}

function invalidateAgendaViews(qc: QueryClient) {
  inv(
    qc,
    queryKeys.agenda.all(),
    queryKeys.calendar.events.all(),
    queryKeys.today.all(),
    queryKeys.ordenes.all(),
    queryKeys.kanban.all(),
    queryKeys.dashboard.nextActions.all()
  );
}

export function initSyncEngine(qc: QueryClient): () => void {
  const unsubs: Array<() => void> = [];

  unsubs.push(eventBus.on("task.created", () => invalidateTaskViews(qc)));
  unsubs.push(eventBus.on("task.updated", () => invalidateTaskViews(qc)));
  unsubs.push(eventBus.on("task.completed", () => invalidateTaskViews(qc)));
  unsubs.push(eventBus.on("task.deleted", () => invalidateTaskViews(qc)));
  unsubs.push(eventBus.on("task.moved", () => invalidateTaskViews(qc)));

  unsubs.push(eventBus.on("calendar.event.created", () => invalidateAgendaViews(qc)));
  unsubs.push(eventBus.on("calendar.event.updated", () => invalidateAgendaViews(qc)));
  unsubs.push(eventBus.on("calendar.event.completed", () => invalidateAgendaViews(qc)));
  unsubs.push(eventBus.on("calendar.event.deleted", () => invalidateAgendaViews(qc)));

  unsubs.push(
    eventBus.on("order.updated", (p: OrderUpdatedPayload) => {
      inv(
        qc,
        queryKeys.today.items({ date: p.date, userId: p.userId }),
        queryKeys.ordenes.day(p.date, p.userId),
        queryKeys.kanban.all(),
        queryKeys.tasks.all(),
        queryKeys.tareas.all()
      );
    })
  );

  unsubs.push(
    eventBus.on("property.updated", (p: PropertyUpdatedPayload) => {
      inv(
        qc,
        queryKeys.propiedades.all(),
        queryKeys.propiedades.detail(p.propiedadId),
        queryKeys.kanban.all(),
        queryKeys.dashboard.pipeline.all()
      );
    })
  );

  unsubs.push(
    eventBus.on("contact.updated", (p: ContactUpdatedPayload) => {
      inv(
        qc,
        queryKeys.contacts.all(),
        queryKeys.contacts.detail(p.contactoId),
        queryKeys.contactos.all(),
        queryKeys.contactos.detail(p.contactoId),
        queryKeys.dashboard.nextActions.all()
      );
    })
  );

  unsubs.push(
    eventBus.on("user.updated", () => {
      inv(qc, queryKeys.usuarios.all(), queryKeys.notifications.all());
    })
  );

  unsubs.push(
    eventBus.on("zona.updated", (p: ZonaUpdatedPayload) => {
      inv(qc, queryKeys.zonas.all(), queryKeys.zonas.detail(p.zonaId));
    })
  );

  unsubs.push(
    eventBus.on("solicitud.updated", (p: SolicitudUpdatedPayload) => {
      inv(qc, queryKeys.solicitudes.all(), queryKeys.solicitudes.detail(p.pedidoId));
    })
  );

  return () => unsubs.forEach((fn) => fn());
}
