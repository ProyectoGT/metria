/**
 * Typed CRM event catalog.
 *
 * Every mutation in the system should emit one of these events so the
 * sync engine can decide which query caches to invalidate — keeping all
 * views consistent without duplicating invalidation logic in each hook.
 */

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface TaskCreatedPayload   { tareaId: number; empresaId: number; date?: string | null }
export interface TaskUpdatedPayload   { tareaId: number }
export interface TaskCompletedPayload { tareaId: number; source?: "kanban" | "ordenes" }
export interface TaskDeletedPayload   { tareaId: number }
export interface TaskMovedPayload     { tareaId: number; fromCol: string; toCol: string }

export interface CalendarEventCreatedPayload   { agendaId: number; date: string }
export interface CalendarEventUpdatedPayload   { agendaId: number; date?: string }
export interface CalendarEventCompletedPayload { agendaId: number }
export interface CalendarEventDeletedPayload   { agendaId: number }

export interface OrderUpdatedPayload   { date: string; userId: number }
export interface PropertyUpdatedPayload { propiedadId: number }
export interface ContactUpdatedPayload  { contactoId: number }
export interface UserUpdatedPayload     { usuarioId: number }
export interface ZonaUpdatedPayload     { zonaId: number }
export interface SolicitudUpdatedPayload { pedidoId: number }

// ─── Discriminated union ──────────────────────────────────────────────────────

export type CRMEvent =
  | { type: "task.created";              payload: TaskCreatedPayload }
  | { type: "task.updated";              payload: TaskUpdatedPayload }
  | { type: "task.completed";            payload: TaskCompletedPayload }
  | { type: "task.deleted";              payload: TaskDeletedPayload }
  | { type: "task.moved";                payload: TaskMovedPayload }
  | { type: "calendar.event.created";    payload: CalendarEventCreatedPayload }
  | { type: "calendar.event.updated";    payload: CalendarEventUpdatedPayload }
  | { type: "calendar.event.completed";  payload: CalendarEventCompletedPayload }
  | { type: "calendar.event.deleted";    payload: CalendarEventDeletedPayload }
  | { type: "order.updated";             payload: OrderUpdatedPayload }
  | { type: "property.updated";          payload: PropertyUpdatedPayload }
  | { type: "contact.updated";           payload: ContactUpdatedPayload }
  | { type: "user.updated";              payload: UserUpdatedPayload }
  | { type: "zona.updated";              payload: ZonaUpdatedPayload }
  | { type: "solicitud.updated";         payload: SolicitudUpdatedPayload };

export type CRMEventType = CRMEvent["type"];

// Helper to extract a payload type by event type string
export type PayloadOf<T extends CRMEventType> = Extract<CRMEvent, { type: T }>["payload"];
