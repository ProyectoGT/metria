"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { queryKeys } from "@/lib/query-keys";
import type { Agenda } from "@/types";

// ─── Fetch functions ──────────────────────────────────────────────────────────

interface CalendarParams {
  start:     string; // ISO date YYYY-MM-DD
  end:       string; // ISO date YYYY-MM-DD
  userId:    number;
  agentIds?: number[];
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
  agentIds?:    number[];
  initialData?: Agenda[];
  enabled?:     boolean;
}

export function useCalendarEvents({
  start,
  end,
  userId,
  initialData,
  enabled = true,
}: UseCalendarEventsOptions) {
  return useQuery({
    queryKey:    queryKeys.agenda.range(start, end, userId),
    queryFn:     () => fetchCalendarEvents({ start, end, userId }),
    initialData,
    enabled,
    staleTime:   1000 * 60 * 2,
  });
}

export function useDayEvents(
  date: string,
  userId: number,
  initialData?: Agenda[]
) {
  return useQuery({
    queryKey: queryKeys.agenda.day(date, userId),
    queryFn:  () => fetchCalendarEvents({ start: date, end: date, userId }),
    initialData,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() });
    },
  });
}

type UpdateEventServerAction = (args: {
  id: number;
  changes: Partial<Agenda>;
}) => Promise<void>;

export function useUpdateCalendarEvent(serverAction: UpdateEventServerAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all() });
    },
  });
}

type DeleteEventServerAction = (id: number) => Promise<void>;

export function useDeleteCalendarEvent(serverAction: DeleteEventServerAction) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serverAction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.agenda.all() });
      queryClient.setQueriesData<Agenda[]>(
        { queryKey: queryKeys.agenda.all() },
        (old) => old?.filter((e) => e.id !== id) ?? []
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda.all() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.ordenes.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all() });
    },
  });
}
