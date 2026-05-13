import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import type {
  CalendarEventCreatedPayload,
  CalendarEventUpdatedPayload,
  ContactUpdatedPayload,
  OrderUpdatedPayload,
  PropertyUpdatedPayload,
  SolicitudUpdatedPayload,
  TaskCompletedPayload,
  TaskCreatedPayload,
  TaskDeletedPayload,
  TaskMovedPayload,
  TaskUpdatedPayload,
  UserUpdatedPayload,
  ZonaUpdatedPayload,
} from "./events";

export type MutationInvalidationEvent =
  | { type: "task.created"; payload: TaskCreatedPayload }
  | { type: "task.updated"; payload: TaskUpdatedPayload }
  | { type: "task.completed"; payload: TaskCompletedPayload }
  | { type: "task.deleted"; payload: TaskDeletedPayload }
  | { type: "task.moved"; payload: TaskMovedPayload }
  | { type: "agenda.created"; payload: CalendarEventCreatedPayload }
  | { type: "agenda.updated"; payload: CalendarEventUpdatedPayload }
  | { type: "agenda.completed"; payload: CalendarEventUpdatedPayload }
  | { type: "agenda.deleted"; payload: CalendarEventUpdatedPayload }
  | { type: "order.updated"; payload: OrderUpdatedPayload }
  | { type: "kanban.cardMoved"; payload: TaskMovedPayload }
  | { type: "contact.updated"; payload: ContactUpdatedPayload }
  | { type: "property.updated"; payload: PropertyUpdatedPayload }
  | { type: "user.updated"; payload: UserUpdatedPayload }
  | { type: "zona.updated"; payload: ZonaUpdatedPayload }
  | { type: "solicitud.updated"; payload: SolicitudUpdatedPayload };

function taskKeys(): QueryKey[] {
  return [
    queryKeys.tasks.all(),
    queryKeys.tareas.all(), // legacy
    queryKeys.today.all(),
    queryKeys.ordenes.all(), // legacy
    queryKeys.dashboard.summary.all(),
  ];
}

function taskActionKeys(): QueryKey[] {
  return [
    ...taskKeys(),
    queryKeys.dashboard.nextActions.all(),
  ];
}

function agendaKeys(): QueryKey[] {
  return [
    queryKeys.agenda.all(),
    queryKeys.calendar.events.all(),
    queryKeys.today.all(),
    queryKeys.ordenes.all(), // legacy
    queryKeys.dashboard.nextActions.all(),
  ];
}

export const invalidationMap = {
  "task.created": () => taskKeys(),
  "task.updated": () => taskActionKeys(),
  "task.completed": () => taskActionKeys(),
  "task.deleted": () => taskActionKeys(),
  "task.moved": () => [
    queryKeys.tasks.all(),
    queryKeys.tareas.all(), // legacy
    queryKeys.today.all(),
    queryKeys.ordenes.all(), // legacy
    queryKeys.kanban.all(),
    queryKeys.dashboard.pipeline.all(),
  ],

  "agenda.created": () => agendaKeys(),
  "agenda.updated": () => agendaKeys(),
  "agenda.completed": () => agendaKeys(),
  "agenda.deleted": () => agendaKeys(),

  "order.updated": (payload: OrderUpdatedPayload) => [
    queryKeys.today.items({ date: payload.date, userId: payload.userId }),
    queryKeys.ordenes.day(payload.date, payload.userId), // legacy
    queryKeys.tasks.all(),
    queryKeys.tareas.all(), // legacy
    queryKeys.kanban.all(),
  ],

  "kanban.cardMoved": () => [
    queryKeys.kanban.all(),
    queryKeys.dashboard.pipeline.all(),
  ],

  "contact.updated": (payload: ContactUpdatedPayload) => [
    queryKeys.contacts.all(),
    queryKeys.contacts.detail(payload.contactoId),
    queryKeys.contactos.all(), // legacy
    queryKeys.contactos.detail(payload.contactoId), // legacy
    queryKeys.dashboard.summary.all(),
  ],

  "property.updated": (payload: PropertyUpdatedPayload) => [
    queryKeys.propiedades.all(),
    queryKeys.propiedades.detail(payload.propiedadId),
    queryKeys.kanban.all(),
    queryKeys.dashboard.pipeline.all(),
  ],

  "user.updated": () => [
    queryKeys.usuarios.all(),
    queryKeys.notifications.all(),
  ],

  "zona.updated": (payload: ZonaUpdatedPayload) => [
    queryKeys.zonas.all(),
    queryKeys.zonas.detail(payload.zonaId),
  ],

  "solicitud.updated": (payload: SolicitudUpdatedPayload) => [
    queryKeys.solicitudes.all(),
    queryKeys.solicitudes.detail(payload.pedidoId),
  ],
};

export function getInvalidationKeys(event: MutationInvalidationEvent): QueryKey[] {
  switch (event.type) {
    case "task.created":
      return invalidationMap["task.created"]();
    case "task.updated":
      return invalidationMap["task.updated"]();
    case "task.completed":
      return invalidationMap["task.completed"]();
    case "task.deleted":
      return invalidationMap["task.deleted"]();
    case "task.moved":
      return invalidationMap["task.moved"]();
    case "agenda.created":
      return invalidationMap["agenda.created"]();
    case "agenda.updated":
      return invalidationMap["agenda.updated"]();
    case "agenda.completed":
      return invalidationMap["agenda.completed"]();
    case "agenda.deleted":
      return invalidationMap["agenda.deleted"]();
    case "order.updated":
      return invalidationMap["order.updated"](event.payload);
    case "kanban.cardMoved":
      return invalidationMap["kanban.cardMoved"]();
    case "contact.updated":
      return invalidationMap["contact.updated"](event.payload);
    case "property.updated":
      return invalidationMap["property.updated"](event.payload);
    case "user.updated":
      return invalidationMap["user.updated"]();
    case "zona.updated":
      return invalidationMap["zona.updated"](event.payload);
    case "solicitud.updated":
      return invalidationMap["solicitud.updated"](event.payload);
  }
}

export async function invalidateAfterMutation(
  queryClient: QueryClient,
  event: MutationInvalidationEvent
) {
  const keys = getInvalidationKeys(event);
  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );
}
