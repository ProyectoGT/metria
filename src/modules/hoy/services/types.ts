export type HoyItemKind =
  | "tarea_vencida"
  | "tarea_hoy"
  | "agenda_hoy"
  | "proxima_accion"
  | "propiedad_sin_seguimiento"
  | "pedido_sin_movimiento"
  | "alerta_ticket"
  | "alerta_recordatorio"
  | "actividad_reciente";

export type HoyPriority = "alta" | "media" | "baja";

export type HoyItem = {
  id: string;
  kind: HoyItemKind;
  title: string;
  description?: string;
  priority: HoyPriority;
  dueDate?: string;
  time?: string;
  entityType?: "tarea" | "agenda" | "propiedad" | "pedido" | "soporte" | "contacto" | "email" | "idealista";
  entityId?: number;
  entityLabel?: string;
  entityHref?: string;
  assignedUserId?: number;
  assignedUserName?: string;
  isCompleted?: boolean;
  metadata?: Record<string, unknown>;
};

export type HoySection = {
  id: string;
  title: string;
  icon: string;
  items: HoyItem[];
  count: number;
};

export type HoyData = {
  sections: HoySection[];
  currentUserId: number;
  currentUserName: string;
  currentUserRole: string;
  dateLabel: string;
};
