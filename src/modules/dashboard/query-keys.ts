import {
  queryKeys,
  type DashboardNextActionsFilters,
  type DashboardPipelineFilters,
  type DashboardSummaryFilters,
} from "@/lib/query-keys";

export const dashboardKeys = {
  all: queryKeys.dashboard.all,
  summary: (filters: DashboardSummaryFilters) => queryKeys.dashboard.summary.list(filters),
  nextActions: (filters: DashboardNextActionsFilters) => queryKeys.dashboard.nextActions.list(filters),
  pipeline: (filters: DashboardPipelineFilters) => queryKeys.dashboard.pipeline.list(filters),
};
