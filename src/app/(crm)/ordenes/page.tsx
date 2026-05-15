import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { formatLocalDateEs, localDateKey } from "@/lib/local-date-time";
import { normalizeAgendaEvent } from "@/modules/calendario/services/normalize-agenda-event";
import PageHeader from "@/components/layout/page-header";
import OrdenesClient from "./ordenes-client";

export default async function OrdenesPage() {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();

  if (!yo) {
    return <div className="p-6 text-text-secondary">No autenticado.</div>;
  }

  const today = localDateKey();
  // Orden del día es una vista personal: cada usuario ve solo sus propias
  // actividades, independientemente del rol. Los roles de gestión no implican
  // ver las tareas ajenas aquí; para eso existe la vista de equipo/dashboard.
  const allowedUserIds = [yo.id];

  const agendaAdmin = createAdminClient();

  const [{ data: actividadesRaw, error: actividadesError }, { data: usuarios }] = await Promise.all([
    agendaAdmin
      .from("agenda")
      .select("id, description, event_date, time, priority, tipo, completed, result, gcal_event_id, user_id, owner_user_id, empresa_id, equipo_id, visibility, archived_at, archived_reason, converted_to_tarea_id, created_at, agenda_usuarios(usuario_id, usuarios(nombre, apellidos))")
      .is("archived_at", null)
      .eq("empresa_id", yo.empresaId ?? -1)
      .eq("event_date", today)
      .order("time", { ascending: true, nullsFirst: false }),
    supabase
      .from("usuarios")
      .select("id, nombre, apellidos")
      .order("nombre"),
  ]);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[ordenes] agenda-query params", {
      userId: yo.id, role: yo.role, empresaId: yo.empresaId, today,
      actividadesCount: actividadesRaw?.length ?? "null",
    });
    if (actividadesError) {
      console.error("[ordenes] Error cargando actividades:", {
        message: actividadesError?.message,
        details: actividadesError?.details,
        hint: actividadesError?.hint,
        code: actividadesError?.code,
        raw: JSON.stringify(actividadesError, Object.getOwnPropertyNames(actividadesError)),
      });
    }
  }

  type Actividad = {
    id: number;
    priority?: string | null;
    tipo?: string | null;
    completed?: boolean | null;
    result?: string | null;
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
        key={JSON.stringify(actividades.map((actividad) => ({
          id: actividad.id,
          description: actividad.description,
          time: actividad.time,
          priority: actividad.priority,
          tipo: actividad.tipo,
          completed: actividad.completed,
          result: actividad.result,
          assigned: actividad.agenda_usuarios?.map((u) => u.usuario_id),
        })))}
        initialActividades={actividades as Parameters<typeof OrdenesClient>[0]["initialActividades"]}
        currentUserId={yo.id}
        currentUserRole={yo.role}
        usuarios={usuariosVisibles}
        today={today}
      />
    </>
  );
}
