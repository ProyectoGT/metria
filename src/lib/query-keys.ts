/**
 * Centralized TanStack Query key factory.
 *
 * All keys are typed arrays so invalidateQueries works with prefix matching:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.agenda.all() })
 *   → invalidates every agenda query regardless of params.
 */

export const queryKeys = {
  // ── Tareas ───────────────────────────────────────────────────────────────
  tareas: {
    all:    ()                                          => ["tareas"] as const,
    list:   (params: Record<string, unknown>)           => ["tareas", "list", params] as const,
    detail: (id: number)                               => ["tareas", id] as const,
  },

  // ── Agenda ───────────────────────────────────────────────────────────────
  agenda: {
    all:   ()                                          => ["agenda"] as const,
    list:  (params: Record<string, unknown>)           => ["agenda", "list", params] as const,
    day:   (date: string, userId: number)              => ["agenda", "day", date, userId] as const,
    range: (start: string, end: string, userId: number)=> ["agenda", "range", start, end, userId] as const,
  },

  // ── Kanban ───────────────────────────────────────────────────────────────
  kanban: {
    all:   ()                                          => ["kanban"] as const,
    board: (params: Record<string, unknown>)           => ["kanban", "board", params] as const,
  },

  // ── Solicitudes (pedidos) ─────────────────────────────────────────────────
  solicitudes: {
    all:    ()                                         => ["solicitudes"] as const,
    list:   (params: Record<string, unknown>)          => ["solicitudes", "list", params] as const,
    detail: (id: number)                              => ["solicitudes", id] as const,
  },

  // ── Propiedades ──────────────────────────────────────────────────────────
  propiedades: {
    all:    ()                                         => ["propiedades"] as const,
    list:   (params: Record<string, unknown>)          => ["propiedades", "list", params] as const,
    detail: (id: number)                              => ["propiedades", id] as const,
  },

  // ── Contactos ────────────────────────────────────────────────────────────
  contactos: {
    all:    ()                                         => ["contactos"] as const,
    list:   (params: Record<string, unknown>)          => ["contactos", "list", params] as const,
    detail: (id: number)                              => ["contactos", id] as const,
  },

  // ── Usuarios ─────────────────────────────────────────────────────────────
  usuarios: {
    all:    ()                                         => ["usuarios"] as const,
    list:   (empresaId: number)                        => ["usuarios", "list", empresaId] as const,
    detail: (id: number)                              => ["usuarios", id] as const,
  },

  // ── Zonas ────────────────────────────────────────────────────────────────
  zonas: {
    all:    ()                                         => ["zonas"] as const,
    list:   (empresaId: number)                        => ["zonas", "list", empresaId] as const,
    detail: (id: number)                              => ["zonas", id] as const,
  },

  // ── Ordenes del día ───────────────────────────────────────────────────────
  ordenes: {
    all:    ()                                         => ["ordenes"] as const,
    day:    (date: string, userId: number)             => ["ordenes", "day", date, userId] as const,
  },

  // ── Notificaciones ────────────────────────────────────────────────────────
  notifications: {
    all:     ()                                        => ["notifications"] as const,
    forUser: (userId: number)                          => ["notifications", userId] as const,
  },

  // ── Rendimiento ───────────────────────────────────────────────────────────
  rendimiento: {
    all:    ()                                         => ["rendimiento"] as const,
    period: (params: Record<string, unknown>)          => ["rendimiento", "period", params] as const,
  },
} as const;
