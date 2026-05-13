import { queryKeys, type KanbanBoardFilters } from "@/lib/query-keys";

export const kanbanKeys = {
  all: queryKeys.kanban.all,
  board: (filters: KanbanBoardFilters) => queryKeys.kanban.board(filters),
};
