import { queryKeys, type TaskListFilters, type TodayItemsFilters } from "@/lib/query-keys";

export const tasksQueryKeys = {
  all: queryKeys.tasks.all,
  list: (filters: TaskListFilters) => queryKeys.tasks.list(filters),
  detail: queryKeys.tasks.detail,
};

export const taskKeys = tasksQueryKeys;

export const todayKeys = {
  all: queryKeys.today.all,
  items: (filters: TodayItemsFilters) => queryKeys.today.items(filters),
};
