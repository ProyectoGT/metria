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
  agente: string;
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
};

export type OrdenDiaAgente = {
  id: number;
  nombre: string;
  tareas: OrdenDiaTarea[];
};

// ─── Mock: Agente del mes ────────────────────────────────────────────────────
// No existe tabla en la BD; mantener mock hasta que se cree.

export const mockAgentOfMonth: AgentOfMonthData = {
  agente: "Laura Martínez",
  premio: "Mejor cierre del trimestre",
  añadidoPor: "Carlos Méndez",
  mes: "Abril 2026",
};

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
