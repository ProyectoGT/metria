/**
 * Typed singleton event bus for in-session cross-view synchronization.
 *
 * Lives at module scope — no React context needed — so it's callable from
 * mutation callbacks, hooks, or any client-side code without prop drilling.
 *
 * Usage:
 *   import { eventBus } from "@/lib/event-bus";
 *
 *   // Subscribe
 *   const unsub = eventBus.on("task.created", (payload) => { ... });
 *   unsub(); // unsubscribe
 *
 *   // Emit
 *   eventBus.emit({ type: "task.created", payload: { tareaId: 1, empresaId: 2 } });
 */

import type { CRMEvent, CRMEventType, PayloadOf } from "./events";

type Handler<T extends CRMEventType> = (payload: PayloadOf<T>) => void;

class TypedEventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly listeners = new Map<CRMEventType, Set<Handler<any>>>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T extends CRMEventType>(type: T, handler: Handler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.listeners.get(type)!.add(handler as Handler<any>);

    return () => this.off(type, handler);
  }

  /** Unsubscribe a handler. */
  off<T extends CRMEventType>(type: T, handler: Handler<T>): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.listeners.get(type)?.delete(handler as Handler<any>);
  }

  /** Emit an event to all subscribers. Errors in handlers are caught and logged. */
  emit<E extends CRMEvent>(event: E): void {
    const handlers = this.listeners.get(event.type);
    if (!handlers?.size) return;

    for (const handler of handlers) {
      try {
        handler(event.payload);
      } catch (err) {
        console.error(`[EventBus] Handler error for "${event.type}":`, err);
      }
    }
  }

  /** Remove all handlers for a given type (useful in tests). */
  clear(type?: CRMEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  /** Debug helper: list all active subscription counts. */
  debug(): Record<string, number> {
    const out: Record<string, number> = {};
    this.listeners.forEach((set, type) => { out[type] = set.size; });
    return out;
  }
}

export const eventBus = new TypedEventBus();
