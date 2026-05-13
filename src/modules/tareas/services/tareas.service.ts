import { createClient } from "@/lib/supabase-browser";
import { throwIfSupabaseError } from "@/modules/shared/services/service-errors";
import type { Database, Tables } from "@/types/database.types";
import type { TaskListFilters } from "@/lib/query-keys";

export type TareaRow = Tables<"tareas">;
type CreateTaskArgs = Database["public"]["Functions"]["create_pending_tarea"]["Args"];
type UpdateTaskArgs = Database["public"]["Functions"]["update_pending_tarea"]["Args"];
type CompleteTaskArgs = Database["public"]["Functions"]["set_tarea_completed"]["Args"];

export type TareaCreateInput = {
  titulo: string;
  prioridad?: string;
  resultado?: string | null;
  completed?: boolean;
  assignedUserIds?: number[];
  visibility?: string;
};

export type TareaUpdateInput = {
  id: number;
  titulo: string;
  prioridad?: string;
  resultado?: string | null;
  completed?: boolean;
  assignedUserIds?: number[];
};

export type TareaCompleteInput = {
  id: number;
  completed: boolean;
  resultado?: string | null;
};

async function list(filters: TaskListFilters): Promise<TareaRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("tareas")
    .select("*")
    .is("archived_at", null)
    .order("fecha", { ascending: true, nullsFirst: false });

  if (filters.empresaId != null) query = query.eq("empresa_id", filters.empresaId);
  if (filters.status) query = query.eq("estado", filters.status);
  if (filters.assignedUserId != null) query = query.eq("owner_user_id", filters.assignedUserId);
  if (filters.date) query = query.eq("fecha", filters.date);
  if (filters.from) query = query.gte("fecha", filters.from);
  if (filters.to) query = query.lte("fecha", filters.to);

  const { data, error } = await query;
  throwIfSupabaseError(error, "No se pudieron cargar las tareas");
  return data ?? [];
}

async function detail(id: number): Promise<TareaRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tareas")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  throwIfSupabaseError(error, "No se pudo cargar la tarea");
  return data;
}

async function create(input: TareaCreateInput): Promise<TareaRow> {
  const supabase = createClient();
  const args: CreateTaskArgs = {
    p_titulo: input.titulo,
    p_prioridad: input.prioridad,
    p_resultado: input.resultado ?? undefined,
    p_completed: input.completed,
    p_assigned_user_ids: input.assignedUserIds,
    p_visibility: input.visibility,
  };

  const { data, error } = await supabase.rpc("create_pending_tarea", args);
  throwIfSupabaseError(error, "No se pudo crear la tarea");
  return data;
}

async function update(input: TareaUpdateInput): Promise<TareaRow> {
  const supabase = createClient();
  const args: UpdateTaskArgs = {
    p_tarea_id: input.id,
    p_titulo: input.titulo,
    p_prioridad: input.prioridad,
    p_resultado: input.resultado ?? undefined,
    p_completed: input.completed,
    p_assigned_user_ids: input.assignedUserIds,
  };

  const { data, error } = await supabase.rpc("update_pending_tarea", args);
  throwIfSupabaseError(error, "No se pudo actualizar la tarea");
  return data;
}

async function complete(input: TareaCompleteInput): Promise<TareaRow> {
  const supabase = createClient();
  const args: CompleteTaskArgs = {
    p_tarea_id: input.id,
    p_completed: input.completed,
    p_resultado: input.resultado ?? undefined,
  };

  const { data, error } = await supabase.rpc("set_tarea_completed", args);
  throwIfSupabaseError(error, "No se pudo completar la tarea");
  return data;
}

export const tareasService = {
  list,
  detail,
  create,
  update,
  complete,
};
