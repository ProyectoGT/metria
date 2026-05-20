import { eventBus } from "@/lib/event-bus";

export function emitTaskCreated(tareaId: number, empresaId: number) {
  eventBus.emit({ type: "task.created", payload: { tareaId, empresaId } });
}

export function emitTaskUpdated(tareaId: number) {
  eventBus.emit({ type: "task.updated", payload: { tareaId } });
}

export function emitTaskCompleted(tareaId: number, source: "kanban" | "ordenes") {
  eventBus.emit({ type: "task.completed", payload: { tareaId, source } });
}

export function emitTaskDeleted(tareaId: number) {
  eventBus.emit({ type: "task.deleted", payload: { tareaId } });
}

export function emitTodayItemsUpdated(date: string, userId: number) {
  eventBus.emit({ type: "order.updated", payload: { date, userId } });
}
