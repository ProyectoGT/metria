import { eventBus } from "@/lib/event-bus";

export function emitContactUpdated(contactoId: number) {
  eventBus.emit({ type: "contact.updated", payload: { contactoId } });
}
