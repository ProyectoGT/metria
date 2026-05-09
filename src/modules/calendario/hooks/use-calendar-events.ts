"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import { eventBus } from "@/lib/event-bus";
import type { Agenda } from "@/types";

// ─── Fetch ────────────────────────────────────────────────────────────────────

interface CalendarParams {
  start:  string;
  end:    string;
  userId: number;
}

async function fetchCalendarEvents(params: CalendarParams): Promise<Agenda[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agenda")
    .select(`
      id, description, event_date, time, time_end, priority, tipo,
      completed, result, reminder_minutes_before, gcal_event_id,
      converted_to_tarea_id, owner_user_id, user_id, empresa_id,
      equipo_id, visibility, archived_at, created_at,
      agenda_usuarios(usuario_id, usuarios(nombre, apellidos))
    `)
    .gte("event_date", params.start)
    .lte("event_date", params.end)
    .is("archived_at", null)
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Agenda[];
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

interface UseCalendarEventsOptions {
  start:        string;
  end:          string;
  userId:       number;
  initialData?: Agenda[];
  enabled?:     boolean;
}

export function useCalendarEvents({
  start, end, userId, initialData, enabled = true,
}: UseCalendarEventsOptions) {
  return useQuery({
    queryKey:  queryKeys.agenda.range(start, end, userId),
    queryFn:   () => fetchCalendarEvents({ start, end, userId }),
    initialData,
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDayEvents(
  date: string,
  userId: number,
  initialData?: Agenda[]
) {
  return useQuery({
    queryKey:  queryKeys.agenda.day(date, userId),
    queryFn:   () => fetchCalendarEvents({ start: date, end: date, userId }),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type CreateEventServerAction = (data: {
  description:      string;
  eventDate:        string;
  time?:            string | null;
  timeEnd?:         string | null;
  priority?:        string;
  tipo?:            string;
  completed?:       boolean;
  result?:          string | null;
  assignedUserIds?: number[];
  reminderMinutes?: number | null;
}) => Promise<{ id: number }>;

export function useCreateCalendarEvent(serverAction: CreateEventServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (result, vars) => {
      eventBus.emit({
        type:    "calendar.event.created",
        payload: { agendaId: result.id, date: vars.eventDate },
      });
    },
  });
}

type UpdateEventServerAction = (args: {
  id:      number;
  changes: Partial<Agenda>;
}) => Promise<void>;

export function useUpdateCalendarEvent(serverAction: UpdateEventServerAction) {
  return useMutation({
    mutationFn: serverAction,
    onSuccess: (_data, { id, changes }) => {
      eventBus.emit({
        type:    "calendar.event.updated",
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

    // Optimistic removal so the event disappears immediately in the UI
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.agenda.all() });
      const snapshots = qc.getQueriesData<Agenda[]>({ queryKey: queryKeys.agenda.all() });
      qc.setQueriesData<Agenda[]>(
        { queryKey: queryKeys.agenda.all() },
        (old) => old?.filter((e) => e.id !== id) ?? []
      );
      return { snapshots };
    },

    onError: (_err, _id, context) => {
      // Rollback all agenda cache snapshots
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSuccess: (_data, id) => {
      eventBus.emit({ type: "calendar.event.deleted", payload: { agendaId: id } });
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agenda.all() });
    },
  });
}
