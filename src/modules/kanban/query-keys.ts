import { queryKeys, type KanbanBoardFilters } from "@/lib/query-keys";

export const kanbanQueryKeys = {
  all: queryKeys.kanban.all,
  board: (filters: KanbanBoardFilters) => queryKeys.kanban.board(filters),
};

export const kanbanKeys = kanbanQueryKeys;
