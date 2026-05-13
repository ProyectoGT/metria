/**
 * Central TanStack Query key factory.
 *
 * Convention: [domain, scope, params?]
 * - domain: product area ("dashboard", "calendar", "tasks", ...)
 * - scope: resource/view inside that domain ("summary", "events", "list", ...)
 * - params: normalized serializable filters only
 *
 * Legacy Spanish keys are kept as aliases during the migration so existing
 * invalidations keep working while new hooks adopt the normalized domains.
 */

export type DateKey = string; // YYYY-MM-DD

export type DashboardSummaryFilters = {
  empresaId: number;
  userId: number;
  period: "week" | "month" | "quarter" | "year";
  agentId?: number | null;
};

export type DashboardNextActionsFilters = {
  empresaId: number;
  userId: number;
  limit?: number;
};

export type DashboardPipelineFilters = {
  empresaId: number;
  userId: number;
  agentIds?: readonly number[];
};

export type AgendaListFilters = {
  empresaId?: number;
  userId: number;
  from?: DateKey;
  to?: DateKey;
  assignedUserId?: number | null;
};

export type CalendarEventsFilters = {
  userId: number;
  start: DateKey;
  end: DateKey;
  view?: "month" | "week" | "day";
};

export type TaskListFilters = {
  empresaId?: number;
  userId: number;
  status?: "pendiente" | "en_progreso" | "completado";
  assignedUserId?: number | null;
  date?: DateKey | null;
};

export type TodayItemsFilters = {
  userId: number;
  date: DateKey;
};

export type KanbanBoardFilters = {
  empresaId: number;
  userId: number;
  agentIds?: readonly number[];
};

export type ContactsListFilters = {
  empresaId?: number;
  search?: string;
  tipo?: string | null;
  ownerUserId?: number | null;
};

type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | readonly (string | number | boolean)[];

type QueryParams = Record<string, QueryParamValue | undefined>;

export function normalizeIdList(ids?: readonly number[]) {
  return ids?.length ? [...new Set(ids)].sort((a, b) => a - b) : undefined;
}

export function normalizeQueryParams<T extends QueryParams>(params: T) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
  ) as { [K in keyof T as undefined extends T[K] ? K : K]: Exclude<T[K], undefined> };
}

export const queryKeys = {
  dashboard: {
    all: () => ["dashboard"] as const,
    summary: {
      all: () => ["dashboard", "summary"] as const,
      list: (filters: DashboardSummaryFilters) =>
        ["dashboard", "summary", normalizeQueryParams(filters)] as const,
    },
    nextActions: {
      all: () => ["dashboard", "nextActions"] as const,
      list: (filters: DashboardNextActionsFilters) =>
        ["dashboard", "nextActions", normalizeQueryParams(filters)] as const,
    },
    pipeline: {
      all: () => ["dashboard", "pipeline"] as const,
      list: (filters: DashboardPipelineFilters) =>
        [
          "dashboard",
          "pipeline",
          normalizeQueryParams({ ...filters, agentIds: normalizeIdList(filters.agentIds) }),
        ] as const,
    },
  },

  agenda: {
    all: () => ["agenda"] as const,
    list: (filters: AgendaListFilters) =>
      ["agenda", "list", normalizeQueryParams(filters)] as const,

    // Legacy aliases. Prefer queryKeys.calendar.events.* in new code.
    day: (date: string, userId: number) =>
      ["agenda", "day", date, userId] as const,
    range: (start: string, end: string, userId: number) =>
      ["agenda", "range", start, end, userId] as const,
  },

  calendar: {
    all: () => ["calendar"] as const,
    events: {
      all: () => ["calendar", "events"] as const,
      range: (filters: CalendarEventsFilters) =>
        ["calendar", "events", normalizeQueryParams(filters)] as const,
      day: (date: DateKey, userId: number) =>
        ["calendar", "events", normalizeQueryParams({ date, end: date, start: date, userId, view: "day" })] as const,
    },
  },

  tasks: {
    all: () => ["tasks"] as const,
    list: (filters: TaskListFilters) =>
      ["tasks", "list", normalizeQueryParams(filters)] as const,
    detail: (taskId: number) => ["tasks", "detail", taskId] as const,
  },

  today: {
    all: () => ["today"] as const,
    items: (filters: TodayItemsFilters) =>
      ["today", "items", normalizeQueryParams(filters)] as const,
  },

  kanban: {
    all: () => ["kanban"] as const,
    board: (filters: KanbanBoardFilters) =>
      [
        "kanban",
        "board",
        normalizeQueryParams({ ...filters, agentIds: normalizeIdList(filters.agentIds) }),
      ] as const,
  },

  contacts: {
    all: () => ["contacts"] as const,
    list: (filters: ContactsListFilters) =>
      ["contacts", "list", normalizeQueryParams(filters)] as const,
    detail: (contactId: number) => ["contacts", "detail", contactId] as const,
  },

  // Legacy aliases kept for existing hooks and invalidations.
  tareas: {
    all: () => ["tareas"] as const,
    list: (params: Record<string, unknown>) => ["tareas", "list", params] as const,
    detail: (id: number) => ["tareas", id] as const,
  },
  contactos: {
    all: () => ["contactos"] as const,
    list: (params: Record<string, unknown>) => ["contactos", "list", params] as const,
    detail: (id: number) => ["contactos", id] as const,
  },
  ordenes: {
    all: () => ["ordenes"] as const,
    day: (date: string, userId: number) => ["ordenes", "day", date, userId] as const,
  },

  solicitudes: {
    all: () => ["solicitudes"] as const,
    list: (params: Record<string, unknown>) => ["solicitudes", "list", params] as const,
    detail: (id: number) => ["solicitudes", id] as const,
  },
  propiedades: {
    all: () => ["propiedades"] as const,
    list: (params: Record<string, unknown>) => ["propiedades", "list", params] as const,
    detail: (id: number) => ["propiedades", id] as const,
  },
  usuarios: {
    all: () => ["usuarios"] as const,
    list: (empresaId: number) => ["usuarios", "list", empresaId] as const,
    detail: (id: number) => ["usuarios", id] as const,
  },
  zonas: {
    all: () => ["zonas"] as const,
    list: (empresaId: number) => ["zonas", "list", empresaId] as const,
    detail: (id: number) => ["zonas", id] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    forUser: (userId: number) => ["notifications", userId] as const,
  },
  rendimiento: {
    all: () => ["rendimiento"] as const,
    period: (params: Record<string, unknown>) => ["rendimiento", "period", params] as const,
  },
} as const;
