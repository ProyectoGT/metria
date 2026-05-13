/**
 * Central sync engine: connects domain events to TanStack Query invalidations.
 *
 * Components and hooks emit domain events. This engine translates those events
 * into the mutation invalidation map so cross-view synchronization stays in one
 * place.
 */

import type { QueryClient } from "@tanstack/react-query";
import { eventBus } from "./event-bus";
import { invalidateAfterMutation, type MutationInvalidationEvent } from "./invalidation-map";

function invalidate(queryClient: QueryClient, event: MutationInvalidationEvent) {
  void invalidateAfterMutation(queryClient, event);
}

export function initSyncEngine(queryClient: QueryClient): () => void {
  const unsubs: Array<() => void> = [];

  unsubs.push(eventBus.on("task.created", (payload) => {
    invalidate(queryClient, { type: "task.created", payload });
  }));
  unsubs.push(eventBus.on("task.updated", (payload) => {
    invalidate(queryClient, { type: "task.updated", payload });
  }));
  unsubs.push(eventBus.on("task.completed", (payload) => {
    invalidate(queryClient, { type: "task.completed", payload });
  }));
  unsubs.push(eventBus.on("task.deleted", (payload) => {
    invalidate(queryClient, { type: "task.deleted", payload });
  }));
  unsubs.push(eventBus.on("task.moved", (payload) => {
    invalidate(queryClient, { type: "task.moved", payload });
  }));

  unsubs.push(eventBus.on("calendar.event.created", (payload) => {
    invalidate(queryClient, { type: "agenda.created", payload });
  }));
  unsubs.push(eventBus.on("calendar.event.updated", (payload) => {
    invalidate(queryClient, { type: "agenda.updated", payload });
  }));
  unsubs.push(eventBus.on("calendar.event.completed", (payload) => {
    invalidate(queryClient, { type: "agenda.completed", payload });
  }));
  unsubs.push(eventBus.on("calendar.event.deleted", (payload) => {
    invalidate(queryClient, { type: "agenda.deleted", payload });
  }));

  unsubs.push(eventBus.on("order.updated", (payload) => {
    invalidate(queryClient, { type: "order.updated", payload });
  }));
  unsubs.push(eventBus.on("contact.updated", (payload) => {
    invalidate(queryClient, { type: "contact.updated", payload });
  }));
  unsubs.push(eventBus.on("property.updated", (payload) => {
    invalidate(queryClient, { type: "property.updated", payload });
  }));
  unsubs.push(eventBus.on("user.updated", (payload) => {
    invalidate(queryClient, { type: "user.updated", payload });
  }));
  unsubs.push(eventBus.on("zona.updated", (payload) => {
    invalidate(queryClient, { type: "zona.updated", payload });
  }));
  unsubs.push(eventBus.on("solicitud.updated", (payload) => {
    invalidate(queryClient, { type: "solicitud.updated", payload });
  }));

  return () => unsubs.forEach((fn) => fn());
}
