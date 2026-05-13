import { queryKeys, type TaskListFilters, type TodayItemsFilters } from "@/lib/query-keys";

export const taskKeys = {
  all: queryKeys.tasks.all,
  list: (filters: TaskListFilters) => queryKeys.tasks.list(filters),
  detail: queryKeys.tasks.detail,
};

export const todayKeys = {
  all: queryKeys.today.all,
  items: (filters: TodayItemsFilters) => queryKeys.today.items(filters),
};
