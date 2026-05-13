import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterMutation } from "@/lib/invalidation-map";
import { kanbanQueryKeys } from "../query-keys";
import { kanbanService, type KanbanMoveCardInput } from "../services/kanban.service";
import type { KanbanBoard, KanbanQueryParams } from "../types";
import type { KanbanCardData } from "@/lib/mock/dashboard";

type KanbanBoardOptions = {
  enabled?: boolean;
  initialData?: KanbanBoard;
};

export type MoveKanbanCardInput = KanbanMoveCardInput & {
  cardId: string;
  fromCol: string;
  toCol: string;
  toIndex?: number;
  params: KanbanQueryParams;
};

type MoveKanbanCardContext = {
  queryKey: ReturnType<typeof kanbanQueryKeys.board>;
  snapshot?: KanbanBoard;
};

export function useKanbanBoard(params: KanbanQueryParams, options: KanbanBoardOptions = {}) {
  return useQuery({
    queryKey: kanbanQueryKeys.board(params),
    queryFn: () => kanbanService.getBoard(params),
    enabled: options.enabled ?? true,
    initialData: options.initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}

function moveCardInBoard(
  board: KanbanBoard,
  input: Pick<MoveKanbanCardInput, "cardId" | "fromCol" | "toCol" | "toIndex">,
): KanbanBoard {
  let movedCard: KanbanCardData | undefined;
  const columnsWithoutCard = board.columns.map((column) => {
    if (column.id !== input.fromCol) return column;

    return {
      ...column,
      cards: column.cards.filter((card) => {
        if (card.id !== input.cardId) return true;
        movedCard = card;
        return false;
      }),
    };
  });

  if (!movedCard) return board;
  const cardToMove = movedCard;

  return {
    columns: columnsWithoutCard.map((column) => {
      if (column.id !== input.toCol) return column;
      const cards = [...column.cards];
      const insertAt = Math.max(0, Math.min(input.toIndex ?? cards.length, cards.length));
      cards.splice(insertAt, 0, { ...cardToMove, isCompleted: input.toCol === "completado" });
      return { ...column, cards };
    }),
  };
}

export function useMoveKanbanCard() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, MoveKanbanCardInput, MoveKanbanCardContext>({
    mutationFn: (input) =>
      kanbanService.moveCard({
        dbId: input.dbId,
        source: input.source,
        newEstado: input.toCol,
      }),
    onMutate: async (input) => {
      const queryKey = kanbanQueryKeys.board(input.params);
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<KanbanBoard>(queryKey);

      queryClient.setQueryData<KanbanBoard>(queryKey, (current) =>
        current ? moveCardInBoard(current, input) : current,
      );

      return { queryKey, snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(context.queryKey, context.snapshot);
      }
    },
    onSuccess: async (_data, input) => {
      await invalidateAfterMutation(queryClient, {
        type: "kanban.cardMoved",
        payload: {
          tareaId: input.dbId,
          fromCol: input.fromCol,
          toCol: input.toCol,
        },
      });
    },
    onSettled: async (_data, _error, input) => {
      await queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.board(input.params) });
    },
  });
}
