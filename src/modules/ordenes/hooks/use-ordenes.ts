"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import { fetchTodayTaskItems } from "@/modules/tareas/services/today.service";
import type { OrdenDiaTarea } from "@/lib/mock/dashboard";

interface UseOrdenesOptions {
  date: string;
  userId: number;
  initialData?: OrdenDiaTarea[];
}

export function useOrdenes({ date, userId, initialData }: UseOrdenesOptions) {
  return useQuery({
    queryKey: queryKeys.today.items({ date, userId }),
    queryFn: () => fetchTodayTaskItems(date, userId),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });
}

type UpdateTareaEstadoAction = (args: {
  tareaId: number;
  estado: "pendiente" | "en_progreso" | "completado";
  resultado?: string | null;
}) => Promise<void>;

export function useUpdateOrdenEstado(
  serverAction: UpdateTareaEstadoAction,
  date: string,
  userId: number
) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { tareaId, estado }) => {
      if (estado === "completado") {
        eventBus.emit({
          type: "task.completed",
          payload: { tareaId, source: "ordenes" },
        });
      } else {
        eventBus.emit({
          type: "order.updated",
          payload: { date, userId },
        });
      }
    },
  });
}
