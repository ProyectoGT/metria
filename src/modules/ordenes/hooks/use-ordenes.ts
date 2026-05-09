"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import type { OrdenDiaTarea } from "@/lib/mock/dashboard";

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchOrdenesDay(date: string, userId: number): Promise<OrdenDiaTarea[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tareas")
    .select(`
      id, titulo, prioridad, fecha, estado, resultado,
      tarea_usuarios!inner(usuario_id, usuarios(nombre, apellidos)),
      agenda(id, time)
    `)
    .in("tarea_usuarios.usuario_id", [userId])
    .eq("fecha", date)
    .is("archived_at", null)
    .order("estado", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((t) => ({
    id:       t.id,
    titulo:   t.titulo,
    prioridad: (t.prioridad as OrdenDiaTarea["prioridad"]) ?? null,
    fecha:    t.fecha,
    estado:   (t.estado as OrdenDiaTarea["estado"]) ?? "pendiente",
    resultado: t.resultado as string | null,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseOrdenesOptions {
  date:         string;
  userId:       number;
  initialData?: OrdenDiaTarea[];
}

export function useOrdenes({ date, userId, initialData }: UseOrdenesOptions) {
  return useQuery({
    queryKey:    queryKeys.ordenes.day(date, userId),
    queryFn:     () => fetchOrdenesDay(date, userId),
    initialData,
    staleTime:   1000 * 60, // 1 min — ordenes cambian con frecuencia
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type UpdateTareaEstadoAction = (args: {
  tareaId: number;
  estado: "pendiente" | "en_progreso" | "completado";
  resultado?: string | null;
}) => Promise<void>;

export function useUpdateOrdenEstado(serverAction: UpdateTareaEstadoAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tareas.all() });
    },
  });
}
