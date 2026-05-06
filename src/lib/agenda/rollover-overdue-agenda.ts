import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeActivityPriority } from "@/lib/activity-options";

type RolloverAgendaRow = {
  id: number;
  description: string;
  priority: string | null;
  result: string | null;
  user_id: number | null;
  owner_user_id: number | null;
  empresa_id: number | null;
  equipo_id: number | null;
  visibility: string | null;
  agenda_usuarios?: Array<{ usuario_id: number }>;
};

function assignedIdsForAgenda(row: RolloverAgendaRow) {
  const relationIds = row.agenda_usuarios?.map((item) => item.usuario_id) ?? [];
  const fallbackIds = [row.user_id, row.owner_user_id].filter((id): id is number => id != null);
  return Array.from(new Set(relationIds.length ? relationIds : fallbackIds));
}

export async function rolloverOverdueAgendaToPendingTasks(args: {
  empresaId: number | null;
  today: string;
}) {
  if (!args.empresaId) return { converted: 0 };

  const supabase = createAdminClient();
  const { data: overdueAgenda, error } = await supabase
    .from("agenda")
    .select("id, description, priority, result, user_id, owner_user_id, empresa_id, equipo_id, visibility, agenda_usuarios(usuario_id)")
    .eq("empresa_id", args.empresaId)
    .is("archived_at", null)
    .is("converted_to_tarea_id", null)
    .eq("completed", false)
    .lt("event_date", args.today)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[agenda-rollover] Error cargando agenda vencida:", error);
    return { converted: 0 };
  }

  let converted = 0;
  for (const agenda of (overdueAgenda ?? []) as RolloverAgendaRow[]) {
    const assignedUserIds = assignedIdsForAgenda(agenda);
    const firstAssigned = assignedUserIds[0] ?? agenda.owner_user_id ?? agenda.user_id;
    if (!firstAssigned) continue;

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("tareas")
      .select("id")
      .eq("converted_to_agenda_id", agenda.id)
      .is("archived_at", null)
      .maybeSingle();

    if (existingTaskError) {
      console.error("[agenda-rollover] Error comprobando tarea existente:", existingTaskError);
      continue;
    }

    const task = existingTask ?? await (async () => {
      const { data: insertedTask, error: insertError } = await supabase
        .from("tareas")
        .insert({
          titulo: agenda.description,
          prioridad: normalizeActivityPriority(agenda.priority),
          estado: "pendiente",
          fecha: null,
          agente_asignado: firstAssigned,
          owner_user_id: agenda.owner_user_id ?? firstAssigned,
          empresa_id: agenda.empresa_id,
          equipo_id: agenda.equipo_id,
          visibility: agenda.visibility ?? "private",
          resultado: agenda.result,
          from_orden_dia: true,
          converted_to_agenda_id: agenda.id,
        })
        .select("id")
        .single();

      if (insertError || !insertedTask) {
        console.error("[agenda-rollover] Error creando tarea pendiente:", insertError);
        return null;
      }

      return insertedTask;
    })();

    if (!task) continue;

    const { error: assignError } = await supabase
      .from("tarea_usuarios")
      .upsert(
        assignedUserIds.map((usuario_id) => ({ tarea_id: task.id, usuario_id })),
        { onConflict: "tarea_id,usuario_id" },
      );

    if (assignError) {
      console.error("[agenda-rollover] Error copiando asignaciones:", assignError);
    }

    const { error: archiveError } = await supabase
      .from("agenda")
      .update({
        archived_at: new Date().toISOString(),
        archived_reason: "rolled_over_to_pending",
        converted_to_tarea_id: task.id,
      })
      .eq("id", agenda.id)
      .is("archived_at", null)
      .is("converted_to_tarea_id", null);

    if (archiveError) {
      console.error("[agenda-rollover] Error archivando agenda:", archiveError);
      continue;
    }

    converted += 1;
  }

  return { converted };
}
