import { eventBus } from "@/lib/event-bus";

export function emitKanbanTaskMoved(tareaId: number, fromCol: string, toCol: string) {
  eventBus.emit({ type: "task.moved", payload: { tareaId, fromCol, toCol } });
}

export function emitKanbanTaskCreated(tareaId: number, empresaId: number) {
  eventBus.emit({ type: "task.created", payload: { tareaId, empresaId } });
}

export function emitKanbanTaskCompleted(tareaId: number) {
  eventBus.emit({ type: "task.completed", payload: { tareaId, source: "kanban" } });
}

export function emitKanbanTaskDeleted(tareaId: number) {
  eventBus.emit({ type: "task.deleted", payload: { tareaId } });
}
