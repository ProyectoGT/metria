import { queryKeys, type AgendaListFilters, type CalendarEventsFilters } from "@/lib/query-keys";

export const agendaQueryKeys = {
  all: queryKeys.agenda.all,
  list: (filters: AgendaListFilters) => queryKeys.agenda.list(filters),
  calendarEvents: (filters: CalendarEventsFilters) => queryKeys.calendar.events.range(filters),
};

export const agendaKeys = agendaQueryKeys;
