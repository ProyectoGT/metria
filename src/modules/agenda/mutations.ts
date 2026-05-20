import { eventBus } from "@/lib/event-bus";

export function emitAgendaCreated(agendaId: number, date: string) {
  eventBus.emit({ type: "calendar.event.created", payload: { agendaId, date } });
}

export function emitAgendaUpdated(agendaId: number, date?: string) {
  eventBus.emit({ type: "calendar.event.updated", payload: { agendaId, date } });
}

export function emitAgendaCompleted(agendaId: number) {
  eventBus.emit({ type: "calendar.event.completed", payload: { agendaId } });
}

export function emitAgendaDeleted(agendaId: number) {
  eventBus.emit({ type: "calendar.event.deleted", payload: { agendaId } });
}
