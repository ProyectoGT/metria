import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterMutation } from "@/lib/invalidation-map";
import { agendaQueryKeys } from "../query-keys";
import {
  agendaService,
  type AgendaCompleteInput,
  type AgendaCreateInput,
  type AgendaDeleteInput,
  type AgendaRow,
  type AgendaUpdateInput,
} from "../services/agenda.service";
import type { AgendaEvent, AgendaEventsFilters } from "../types";

type AgendaItemsOptions = {
  initialData?: AgendaEvent[];
  enabled?: boolean;
};

export function useAgendaItems(filters: AgendaEventsFilters, options: AgendaItemsOptions = {}) {
  return useQuery({
    queryKey: agendaQueryKeys.calendarEvents(filters),
    queryFn: () => agendaService.list(filters),
    initialData: options.initialData,
    enabled: options.enabled ?? true,
  });
}

export function useCreateAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AgendaCreateInput) => agendaService.create(input),
    onSuccess: async (row: AgendaRow) => {
      await invalidateAfterMutation(queryClient, {
        type: "agenda.created",
        payload: { agendaId: row.id, date: row.event_date },
      });
    },
  });
}

export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AgendaUpdateInput) => agendaService.update(input),
    onSuccess: async (row: AgendaRow) => {
      await invalidateAfterMutation(queryClient, {
        type: "agenda.updated",
        payload: { agendaId: row.id, date: row.event_date },
      });
    },
  });
}

export function useDeleteAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AgendaDeleteInput) => agendaService.delete(input),
    onSuccess: async (row: AgendaRow) => {
      await invalidateAfterMutation(queryClient, {
        type: "agenda.deleted",
        payload: { agendaId: row.id, date: row.event_date },
      });
    },
  });
}

export function useCompleteAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AgendaCompleteInput) => agendaService.complete(input),
    onSuccess: async (row: AgendaRow) => {
      await invalidateAfterMutation(queryClient, {
        type: "agenda.completed",
        payload: { agendaId: row.id, date: row.event_date },
      });
    },
  });
}
