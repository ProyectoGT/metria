import type { JobHandler } from "./types";

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(handler: JobHandler): void {
  if (handlers.has(handler.type)) {
    console.warn(`[jobs] Handler already registered for type "${handler.type}", overwriting`);
  }
  handlers.set(handler.type, handler);
}

export function getJobHandler(type: string): JobHandler | undefined {
  return handlers.get(type);
}

export function getAllHandlers(): JobHandler[] {
  return Array.from(handlers.values());
}

export function getRegisteredTypes(): string[] {
  return Array.from(handlers.keys());
}

export function registerJobHandlers(...handlersList: JobHandler[]): void {
  for (const handler of handlersList) {
    registerJobHandler(handler);
  }
}
