// ─── Tipos compartidos ────────────────────────────────────────────────────────

export type SummaryData = {
  noticias: number;
  investigaciones: number;
  encargos: number;
  pedidosActivos: number;
};

export type SummaryType = keyof SummaryData;

export type PropertyListing = {
  id: string;
  nombre: string;
  sector: string;
  finca: string;
  estado: string;
  agente: string;
  // IDs para navegar a la ficha del piso (solo propiedades, no pedidos)
  zonaId?: number;
  sectorId?: number;
  fincaId?: number;
};

export type Rendimiento = {
  facturado: number;
  objetivo_facturado: number;
  encargos: number;
  objetivo_encargos: number;
  ventas: number;
  objetivo_ventas: number;
  contactos: number;
  objetivo_contactos: number;
};

export type AgentMetrics = {
  id: string;
  nombre: string;
  rendimiento: Rendimiento;
};

export type AgentOfMonthData = {
  id?: number;
  agente: string | null; // null = premio sin premiado asignado aún
  agenteId?: number | null;
  premio: string;
  añadidoPor: string;
  mes: string;
};

export type KanbanPriority = "alta" | "media" | "baja";

export type KanbanCardData = {
  id: string;
  title: string;
  description?: string;
  priority: KanbanPriority;
  dueDate?: string;
  assignedBy?: string | null;
  assignedTo?: string | null;
  resultado?: string | null;
  isCompleted?: boolean;
  fromOrdenDia?: boolean;
};

export type KanbanColumnData = {
  id: string;
  title: string;
  fixed: boolean;
  cards: KanbanCardData[];
};

export type KanbanData = {
  columns: KanbanColumnData[];
};

export type OrdenDiaTarea = {
  id: number;
  titulo: string;
  prioridad: KanbanPriority | null;
  fecha: string | null;
  estado: "pendiente" | "en_progreso" | "completado";
  resultado: string | null;
};

export type OrdenDiaAgente = {
  id: number;
  nombre: string;
  tareas: OrdenDiaTarea[];
};

// ─── Mock: Agente del mes ────────────────────────────────────────────────────
// No existe tabla en la BD; mantener mock hasta que se cree.

export const mockAgentOfMonth: AgentOfMonthData | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function emptyRendimiento(): Rendimiento {
  return {
    facturado: 0,
    objetivo_facturado: 100000,
    encargos: 0,
    objetivo_encargos: 10,
    ventas: 0,
    objetivo_ventas: 5,
    contactos: 0,
    objetivo_contactos: 50,
  };
}
