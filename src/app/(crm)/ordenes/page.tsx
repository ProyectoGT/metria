import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { canViewAllAgents, canViewSupervisedAgents } from "@/lib/roles";
import { formatLocalDateEs, localDateKey } from "@/lib/local-date-time";
import { normalizeAgendaEvent } from "@/lib/agenda/normalize-agenda-event";
import { getMadridTodayRangeUtc } from "@/lib/dates/timezone";
import PageHeader from "@/components/layout/page-header";
import OrdenesClient from "./ordenes-client";

export default async function OrdenesPage() {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();

  if (!yo) {
    return <div className="p-6 text-text-secondary">No autenticado.</div>;
  }

  const today = localDateKey();
  const todayRange = getMadridTodayRangeUtc();
  const allowedUserIds = canViewAllAgents(yo.role)
    ? null
    : canViewSupervisedAgents(yo.role)
      ? [yo.id, ...yo.supervisedAgentIds]
      : [yo.id];

  const agendaClient = canViewSupervisedAgents(yo.role) || canViewAllAgents(yo.role)
    ? createAdminClient()
    : supabase;

  const [{ data: actividadesRaw }, { data: usuarios }] = await Promise.all([
    agendaClient
      .from("agenda")
      .select("id, description, event_date, time, priority, tipo, completed, result, user_id, owner_user_id, empresa_id, created_at, sync_status, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .or(`event_date.eq.${today},and(event_date.is.null,created_at.gte.${todayRange.startUtc},created_at.lte.${todayRange.endUtc})`)
      .order("time", { ascending: true, nullsFirst: false }),
    supabase
      .from("usuarios")
      .select("id, nombre, apellidos")
      .order("nombre"),
  ]);

  type Actividad = {
    owner_user_id: number | null;
    user_id?: number | null;
    event_date?: string | null;
    time?: string | null;
    description?: string | null;
    agenda_usuarios?: { usuario_id: number }[];
  };

  const actividades = ((actividadesRaw ?? []) as unknown as Actividad[]).map((actividad) => {
    const normalized = normalizeAgendaEvent(actividad as Parameters<typeof normalizeAgendaEvent>[0]);
    return {
      ...actividad,
      description: normalized.title,
      event_date: normalized.date,
      time: normalized.timeLabel,
    };
  }).filter((actividad) => {
    if (allowedUserIds === null) return true;
    const assigned = actividad.agenda_usuarios?.map((u) => u.usuario_id) ?? [];
    return assigned.some((id) => allowedUserIds.includes(id))
      || (actividad.owner_user_id != null && allowedUserIds.includes(actividad.owner_user_id))
      || (actividad.user_id != null && allowedUserIds.includes(actividad.user_id));
  });

  const usuariosVisibles = (usuarios ?? []).filter((u) => {
    if (allowedUserIds === null) return true;
    return allowedUserIds.includes(u.id);
  });

  return (
    <>
      <PageHeader
        title="Orden del dia"
        description={`Actividades de hoy - ${formatLocalDateEs(today)}`}
      />
      <OrdenesClient
        initialActividades={actividades as Parameters<typeof OrdenesClient>[0]["initialActividades"]}
        currentUserId={yo.id}
        currentUserRole={yo.role}
        usuarios={usuariosVisibles}
        today={today}
      />
    </>
  );
}
