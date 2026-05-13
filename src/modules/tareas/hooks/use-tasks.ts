import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterMutation } from "@/lib/invalidation-map";
import { tasksQueryKeys } from "../query-keys";
import {
  tareasService,
  type TareaCompleteInput,
  type TareaCreateInput,
  type TareaRow,
  type TareaUpdateInput,
} from "../services/tareas.service";
import type { TaskListQueryFilters } from "../types";

type TasksOptions = {
  enabled?: boolean;
  initialData?: TareaRow[];
};

type TaskOptions = {
  enabled?: boolean;
  initialData?: TareaRow | null;
};

type CompleteTaskMutationInput = TareaCompleteInput & {
  source?: "kanban" | "ordenes";
};

export function useTasks(filters: TaskListQueryFilters, options: TasksOptions = {}) {
  return useQuery({
    queryKey: tasksQueryKeys.list(filters),
    queryFn: () => tareasService.list(filters),
    enabled: options.enabled ?? true,
    initialData: options.initialData,
  });
}

export function useTask(taskId: number | null, options: TaskOptions = {}) {
  return useQuery({
    queryKey: taskId == null ? tasksQueryKeys.detail(0) : tasksQueryKeys.detail(taskId),
    queryFn: () => (taskId == null ? Promise.resolve(null) : tareasService.detail(taskId)),
    enabled: (options.enabled ?? true) && taskId != null,
    initialData: options.initialData,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TareaCreateInput) => tareasService.create(input),
    onSuccess: async (row: TareaRow) => {
      await invalidateAfterMutation(queryClient, {
        type: "task.created",
        payload: { tareaId: row.id, empresaId: row.empresa_id ?? 0, date: row.fecha },
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TareaUpdateInput) => tareasService.update(input),
    onSuccess: async (row: TareaRow) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.detail(row.id) }),
        invalidateAfterMutation(queryClient, {
          type: "task.updated",
          payload: { tareaId: row.id },
        }),
      ]);
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompleteTaskMutationInput) =>
      tareasService.complete({
        id: input.id,
        completed: input.completed,
        resultado: input.resultado,
      }),
    onSuccess: async (row: TareaRow, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.detail(row.id) }),
        invalidateAfterMutation(queryClient, {
          type: "task.completed",
          payload: { tareaId: row.id, source: variables.source },
        }),
      ]);
    },
  });
}
