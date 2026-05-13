"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import { kanbanService } from "@/modules/kanban/services/kanban.service";
import type { KanbanData, KanbanCardData } from "@/lib/mock/dashboard";
import type { KanbanQueryParams } from "@/modules/kanban/types";

interface UseKanbanOptions {
  params: KanbanQueryParams;
  initialData?: KanbanData;
}

export function useKanban({ params, initialData }: UseKanbanOptions) {
  return useQuery({
    queryKey: queryKeys.kanban.board(params),
    queryFn: () => kanbanService.getBoard(params),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}

interface MoveCardArgs {
  cardId: string;
  dbId: number;
  source: "tarea" | "agenda";
  fromCol: string;
  toCol: string;
  params: KanbanQueryParams;
}

type MoveCardServerAction = (args: {
  dbId: number;
  source: "tarea" | "agenda";
  newEstado: string;
}) => Promise<void>;

export function useKanbanMoveCard(serverAction: MoveCardServerAction) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ dbId, source, toCol }: MoveCardArgs) =>
      serverAction({ dbId, source, newEstado: toCol }),
    onMutate: async ({ cardId, fromCol, toCol, params }) => {
      const qk = queryKeys.kanban.board(params);
      await qc.cancelQueries({ queryKey: qk });
      const snapshot = qc.getQueryData<KanbanData>(qk);

      qc.setQueryData<KanbanData>(qk, (old) => {
        if (!old) return old;
        let movedCard: KanbanCardData | undefined;

        const columns = old.columns.map((col) => {
          if (col.id !== fromCol) return col;
          return {
            ...col,
            cards: col.cards.filter((card) => {
              if (card.id === cardId) {
                movedCard = card;
                return false;
              }
              return true;
            }),
          };
        });

        if (!movedCard) return { columns };

        const updated = { ...movedCard, isCompleted: toCol === "completado" };
        return {
          columns: columns.map((col) =>
            col.id === toCol ? { ...col, cards: [...col.cards, updated] } : col
          ),
        };
      });

      return { snapshot, qk };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) qc.setQueryData(context.qk, context.snapshot);
    },
    onSuccess: (_data, { dbId, fromCol, toCol }) => {
      eventBus.emit({ type: "task.moved", payload: { tareaId: dbId, fromCol, toCol } });
    },
    onSettled: (_data, _err, { params }) => {
      qc.invalidateQueries({ queryKey: queryKeys.kanban.board(params) });
    },
  });
}

type CreateCardServerAction = (data: {
  titulo: string;
  prioridad: string;
  fecha?: string;
  estado?: string;
  assignedUserIds?: number[];
}) => Promise<{ id: number }>;

export function useKanbanCreateCard(serverAction: CreateCardServerAction, empresaId: number) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (result) => {
      eventBus.emit({
        type: "task.created",
        payload: { tareaId: result.id, empresaId },
      });
    },
  });
}

type CompleteCardServerAction = (args: {
  dbId: number;
  source: "tarea" | "agenda";
  resultado?: string | null;
}) => Promise<void>;

export function useKanbanCompleteCard(serverAction: CompleteCardServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { dbId, source }) => {
      if (source === "tarea") {
        eventBus.emit({ type: "task.completed", payload: { tareaId: dbId, source: "kanban" } });
      } else {
        eventBus.emit({ type: "calendar.event.completed", payload: { agendaId: dbId } });
      }
    },
  });
}

type DeleteCardServerAction = (args: {
  dbId: number;
  source: "tarea" | "agenda";
}) => Promise<void>;

export function useKanbanDeleteCard(serverAction: DeleteCardServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { dbId, source }) => {
      if (source === "tarea") {
        eventBus.emit({ type: "task.deleted", payload: { tareaId: dbId } });
      } else {
        eventBus.emit({ type: "calendar.event.deleted", payload: { agendaId: dbId } });
      }
    },
  });
}
