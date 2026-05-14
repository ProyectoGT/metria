import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterMutation } from "@/lib/invalidation-map";
import { trackAppEvent, trackMutationError } from "@/lib/observability";
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
      trackAppEvent({
        event: "agenda_activity.created",
        orgId: row.empresa_id,
        module: "agenda",
        action: "create",
        entityType: "agenda_activity",
        entityId: row.id,
        metadata: { date: row.event_date },
      });
      await invalidateAfterMutation(queryClient, {
        type: "agenda.created",
        payload: { agendaId: row.id, date: row.event_date },
      });
    },
    onError: (error) => {
      trackMutationError({
        module: "agenda",
        action: "create",
        entityType: "agenda_activity",
        errorCode: "AGENDA_CREATE_FAILED",
        error,
      });
    },
  });
}

export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AgendaUpdateInput) => agendaService.update(input),
    onSuccess: async (row: AgendaRow) => {
      trackAppEvent({
        event: "agenda_activity.updated",
        orgId: row.empresa_id,
        module: "agenda",
        action: "update",
        entityType: "agenda_activity",
        entityId: row.id,
        metadata: { date: row.event_date },
      });
      await invalidateAfterMutation(queryClient, {
        type: "agenda.updated",
        payload: { agendaId: row.id, date: row.event_date },
      });
    },
    onError: (error, input) => {
      trackMutationError({
        module: "agenda",
        action: "update",
        entityType: "agenda_activity",
        entityId: input.id,
        errorCode: "AGENDA_UPDATE_FAILED",
        error,
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
    onError: (error, input) => {
      trackMutationError({
        module: "agenda",
        action: "update",
        entityType: "agenda_activity",
        entityId: input.id,
        errorCode: "AGENDA_DELETE_FAILED",
        error,
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
    onError: (error, input) => {
      trackMutationError({
        module: "agenda",
        action: "complete",
        entityType: "agenda_activity",
        entityId: input.id,
        errorCode: "AGENDA_COMPLETE_FAILED",
        error,
      });
    },
  });
}
