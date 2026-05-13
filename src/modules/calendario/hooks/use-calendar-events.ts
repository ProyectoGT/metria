"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import { fetchAgendaEvents } from "@/modules/agenda/services/agenda.service";
import type { Agenda } from "@/types";

interface UseCalendarEventsOptions {
  start: string;
  end: string;
  userId: number;
  initialData?: Agenda[];
  enabled?: boolean;
}

export function useCalendarEvents({
  start,
  end,
  userId,
  initialData,
  enabled = true,
}: UseCalendarEventsOptions) {
  return useQuery({
    queryKey: queryKeys.calendar.events.range({ start, end, userId }),
    queryFn: () => fetchAgendaEvents({ start, end, userId }),
    initialData,
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDayEvents(date: string, userId: number, initialData?: Agenda[]) {
  return useQuery({
    queryKey: queryKeys.calendar.events.day(date, userId),
    queryFn: () => fetchAgendaEvents({ start: date, end: date, userId, view: "day" }),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  });
}

type CreateEventServerAction = (data: {
  description: string;
  eventDate: string;
  time?: string | null;
  timeEnd?: string | null;
  priority?: string;
  tipo?: string;
  completed?: boolean;
  result?: string | null;
  assignedUserIds?: number[];
  reminderMinutes?: number | null;
}) => Promise<{ id: number }>;

export function useCreateCalendarEvent(serverAction: CreateEventServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (result, vars) => {
      eventBus.emit({
        type: "calendar.event.created",
        payload: { agendaId: result.id, date: vars.eventDate },
      });
    },
  });
}

type UpdateEventServerAction = (args: {
  id: number;
  changes: Partial<Agenda>;
}) => Promise<void>;

export function useUpdateCalendarEvent(serverAction: UpdateEventServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { id, changes }) => {
      eventBus.emit({
        type: "calendar.event.updated",
        payload: { agendaId: id, date: changes.event_date ?? undefined },
      });
    },
  });
}

type CompleteEventServerAction = (args: { id: number }) => Promise<void>;

export function useCompleteCalendarEvent(serverAction: CompleteEventServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { id }) => {
      eventBus.emit({ type: "calendar.event.completed", payload: { agendaId: id } });
    },
  });
}

type DeleteEventServerAction = (id: number) => Promise<void>;

export function useDeleteCalendarEvent(serverAction: DeleteEventServerAction) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.calendar.events.all() });
      const snapshots = qc.getQueriesData<Agenda[]>({ queryKey: queryKeys.calendar.events.all() });

      qc.setQueriesData<Agenda[]>(
        { queryKey: queryKeys.calendar.events.all() },
        (old) => old?.filter((event) => event.id !== id) ?? []
      );

      return { snapshots };
    },
    onError: (_err, _id, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: (_data, id) => {
      eventBus.emit({ type: "calendar.event.deleted", payload: { agendaId: id } });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.calendar.events.all() });
      // Legacy invalidation during migration.
      qc.invalidateQueries({ queryKey: queryKeys.agenda.all() });
    },
  });
}
