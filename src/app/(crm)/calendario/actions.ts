"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase-admin";

type SaveAgendaGoogleEventIdResult =
  | {
      success: true;
      data: {
        id: number;
        gcal_event_id: string | null;
      };
    }
  | {
      success: false;
      error: {
        message: string;
        details?: string;
        hint?: string;
        code?: string;
      };
    };

function canModifyAgenda(args: {
  role: string;
  currentUserId: number;
  ownerUserId: number | null;
  userId: number | null;
}) {
  return (
    args.role === "Administrador" ||
    args.role === "Director" ||
    args.ownerUserId === args.currentUserId ||
    args.userId === args.currentUserId
  );
}

export async function saveAgendaGoogleEventIdAction(
  agendaId: number,
  gcalEventId: string,
): Promise<SaveAgendaGoogleEventIdResult> {
  const yo = await getCurrentUserContext();
  if (!yo) {
    return { success: false, error: { message: "No autenticado", code: "AUTH_REQUIRED" } };
  }

  if (!Number.isInteger(agendaId) || agendaId <= 0) {
    return { success: false, error: { message: "ID de agenda no valido", code: "INVALID_AGENDA_ID" } };
  }

  if (!gcalEventId.trim()) {
    return { success: false, error: { message: "ID de Google Calendar no valido", code: "INVALID_GCAL_EVENT_ID" } };
  }

  const supabase = createAdminClient();

  const { data: agenda, error: readError } = await supabase
    .from("agenda")
    .select("id, empresa_id, owner_user_id, user_id")
    .eq("id", agendaId)
    .maybeSingle();

  if (readError) {
    return {
      success: false,
      error: {
        message: readError.message,
        details: readError.details,
        hint: readError.hint,
        code: readError.code,
      },
    };
  }

  if (!agenda) {
    return { success: false, error: { message: "La actividad local no existe", code: "AGENDA_NOT_FOUND" } };
  }

  if (yo.empresaId === null || agenda.empresa_id !== yo.empresaId) {
    return {
      success: false,
      error: { message: "No puedes modificar una actividad de otra empresa", code: "AGENDA_COMPANY_FORBIDDEN" },
    };
  }

  if (
    !canModifyAgenda({
      role: yo.role,
      currentUserId: yo.id,
      ownerUserId: agenda.owner_user_id,
      userId: agenda.user_id,
    })
  ) {
    return {
      success: false,
      error: { message: "No tienes permisos para modificar esta actividad", code: "AGENDA_UPDATE_FORBIDDEN" },
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("agenda")
    .update({ gcal_event_id: gcalEventId.trim() })
    .eq("id", agendaId)
    .select("id, gcal_event_id")
    .single();

  if (updateError) {
    return {
      success: false,
      error: {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      },
    };
  }

  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  revalidatePath("/ordenes");

  return { success: true, data: updated };
}
