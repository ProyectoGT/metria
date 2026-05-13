import { createClient } from "@/lib/supabase-browser";
import { throwIfSupabaseError } from "@/modules/shared/services/service-errors";
import type { KanbanCardData, KanbanColumnData } from "@/lib/mock/dashboard";
import type { KanbanBoard, KanbanQueryParams } from "../types";

export type KanbanMoveCardInput = {
  dbId: number;
  source: "tarea" | "agenda";
  newEstado: string;
};

export async function fetchKanbanBoard(params: KanbanQueryParams): Promise<KanbanBoard> {
  const supabase = createClient();
  const userScope = params.agentIds?.length ? params.agentIds : [params.userId];

  const { data: tareas, error } = await supabase
    .from("tareas")
    .select(`
      id, titulo, prioridad, fecha, estado, resultado,
      tarea_usuarios!inner(usuario_id, usuarios(nombre, apellidos))
    `)
    .in("tarea_usuarios.usuario_id", userScope)
    .eq("empresa_id", params.empresaId)
    .in("estado", ["pendiente", "en_progreso"])
    .is("archived_at", null)
    .order("fecha", { ascending: true, nullsFirst: false });

  throwIfSupabaseError(error, "No se pudo cargar el tablero kanban");

  const pendientes: KanbanCardData[] = [];
  const enProgreso: KanbanCardData[] = [];

  for (const t of tareas ?? []) {
    const assignedUsers = (
      (t.tarea_usuarios as Array<{ usuarios: { nombre: string | null; apellidos: string | null } | null } | null>) ?? []
    )
      .map((tu) => `${tu?.usuarios?.nombre ?? ""} ${tu?.usuarios?.apellidos ?? ""}`.trim())
      .filter(Boolean);

    const card: KanbanCardData = {
      id: `tarea-${t.id}`,
      source: "tarea",
      dbId: t.id,
      title: t.titulo,
      priority: (t.prioridad as "alta" | "media" | "baja") ?? "media",
      dueDate: t.fecha ?? undefined,
      resultado: t.resultado as string | null,
      isCompleted: t.estado === "completado",
      assignedUsers,
    };

    if (t.estado === "en_progreso") enProgreso.push(card);
    else pendientes.push(card);
  }

  const columns: KanbanColumnData[] = [
    { id: "pendiente", title: "Pendiente", fixed: true, cards: pendientes },
    { id: "en_progreso", title: "En progreso", fixed: false, cards: enProgreso },
    { id: "completado", title: "Completado", fixed: true, cards: [] },
  ];

  return { columns };
}

async function moveCard(input: KanbanMoveCardInput): Promise<void> {
  const supabase = createClient();

  if (input.source === "agenda") {
    const completed = input.newEstado === "completado";
    const { error } = await supabase.rpc("update_agenda_activity_v2", {
      p_agenda_id: input.dbId,
      p_completed: completed,
    });
    throwIfSupabaseError(error, "No se pudo mover la actividad de agenda");
    return;
  }

  const estado = input.newEstado === "completado" ? "completado" : input.newEstado;
  const { error } = await supabase
    .from("tareas")
    .update({ estado })
    .eq("id", input.dbId);
  throwIfSupabaseError(error, "No se pudo mover la tarea");
}

export const kanbanService = {
  getBoard: fetchKanbanBoard,
  moveCard,
};
