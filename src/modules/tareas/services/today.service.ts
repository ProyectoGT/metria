import { createClient } from "@/lib/supabase-browser";
import type { TodayTaskItem } from "../types";

export async function fetchTodayTaskItems(date: string, userId: number): Promise<TodayTaskItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tareas")
    .select(`
      id, titulo, prioridad, fecha, estado, resultado,
      tarea_usuarios!inner(usuario_id)
    `)
    .in("tarea_usuarios.usuario_id", [userId])
    .eq("fecha", date)
    .is("archived_at", null)
    .order("estado", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    prioridad: (t.prioridad as TodayTaskItem["prioridad"]) ?? null,
    fecha: t.fecha,
    estado: (t.estado as TodayTaskItem["estado"]) ?? "pendiente",
    resultado: t.resultado as string | null,
  }));
}
