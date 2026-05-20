import { createClient } from "@/lib/supabase-browser";
import { throwIfSupabaseError } from "@/modules/shared/services/service-errors";
import { getNextBestActions, type NextBestAction } from "./next-actions";
import type { CurrentUserContext } from "@/lib/current-user";

export type DashboardSummaryFilters = {
  empresaId?: number | null;
  userId: number;
};

export type DashboardSummary = {
  propiedades: number;
  pedidos: number;
  tareasPendientes: number;
  agendaPendiente: number;
};

async function countQuery(query: PromiseLike<{ count: number | null; error: unknown }>, message: string) {
  const { count, error } = await query;
  throwIfSupabaseError(error as Parameters<typeof throwIfSupabaseError>[0], message);
  return count ?? 0;
}

async function getSummary(filters: DashboardSummaryFilters): Promise<DashboardSummary> {
  const supabase = createClient();
  const propiedades = supabase
    .from("propiedades")
    .select("id", { count: "exact", head: true });
  const pedidos = supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true });
  const tareas = supabase
    .from("tareas")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .neq("estado", "completado");
  const agenda = supabase
    .from("agenda")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("completed", false);

  const scoped = filters.empresaId == null
    ? { propiedades, pedidos, tareas, agenda }
    : {
        propiedades: propiedades.eq("empresa_id", filters.empresaId),
        pedidos: pedidos.eq("empresa_id", filters.empresaId),
        tareas: tareas.eq("empresa_id", filters.empresaId),
        agenda: agenda.eq("empresa_id", filters.empresaId),
      };

  const [propiedadesCount, pedidosCount, tareasCount, agendaCount] = await Promise.all([
    countQuery(scoped.propiedades, "No se pudo calcular propiedades del dashboard"),
    countQuery(scoped.pedidos, "No se pudo calcular pedidos del dashboard"),
    countQuery(scoped.tareas, "No se pudo calcular tareas del dashboard"),
    countQuery(scoped.agenda, "No se pudo calcular agenda del dashboard"),
  ]);

  return {
    propiedades: propiedadesCount,
    pedidos: pedidosCount,
    tareasPendientes: tareasCount,
    agendaPendiente: agendaCount,
  };
}

async function getNextActions(user: CurrentUserContext | null): Promise<NextBestAction[]> {
  return getNextBestActions(user);
}

export const dashboardService = {
  getSummary,
  getNextActions,
};
