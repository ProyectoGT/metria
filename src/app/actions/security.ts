"use server";

import { getCurrentUserContext } from "@/lib/current-user";
import {
  getConfirmationPasswordStatus,
  saveConfirmationPassword,
  verifyConfirmationPassword,
} from "@/lib/delete-confirmation-password";
import { createAdminClient } from "@/lib/supabase-admin";
import { validatePassword } from "@/lib/password";

type ActionResult = {
  success?: boolean;
  error?: string;
};

type DeleteTable = "zona" | "sectores" | "fincas" | "propiedades";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "No se pudo guardar la contraseña de confirmación.";
}

async function deleteRecord(table: DeleteTable, id: number) {
  const supabase = createAdminClient();

  switch (table) {
    case "zona":
      return supabase.rpc("delete_zona_cascade", { target_zona_id: id });
    case "sectores":
      return supabase.rpc("delete_sector_cascade", { target_sector_id: id });
    case "fincas":
      return supabase.rpc("delete_finca_cascade", { target_finca_id: id });
    case "propiedades":
      return supabase.from("propiedades").delete().eq("id", id);
  }
}

function getDeletePermission(
  table: DeleteTable,
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUserContext>>>
) {
  switch (table) {
    case "propiedades":
      return user.canDeletePropiedades;
    case "fincas":
      return user.canDeleteFincas;
    case "sectores":
      return user.canDeleteSectores;
    case "zona":
      return user.canDeleteZonas;
  }
}

function getDeleteErrorMessage(table: DeleteTable) {
  switch (table) {
    case "propiedades":
      return "No tienes permisos para eliminar propiedades.";
    case "fincas":
      return "No tienes permisos para eliminar fincas.";
    case "sectores":
      return "No tienes permisos para eliminar sectores.";
    case "zona":
      return "No tienes permisos para eliminar zonas.";
  }
}

function mapDeleteDatabaseError(message: string, table: DeleteTable) {
  if (
    message.includes("delete_zona_cascade") ||
    message.includes("delete_sector_cascade") ||
    message.includes("delete_finca_cascade")
  ) {
    return "Falta aplicar la nueva migración de borrado en cascada en Supabase.";
  }

  if (message.includes("violates foreign key constraint")) {
    switch (table) {
      case "propiedades":
        return "No se ha podido eliminar la propiedad por una restricción de datos relacionada.";
      case "fincas":
        return "No se puede eliminar la finca porque tiene propiedades asociadas.";
      case "sectores":
        return "No se puede eliminar el sector porque tiene fincas o propiedades asociadas.";
      case "zona":
        return "No se puede eliminar la zona porque tiene sectores, fincas o propiedades asociadas.";
    }
  }

  return message;
}

async function deleteWithConfirmation(
  table: DeleteTable,
  id: number,
  password: string
): Promise<ActionResult> {
  const user = await getCurrentUserContext();

  if (!user) {
    return { error: "Tu sesión no es válida. Vuelve a iniciar sesión." };
  }

  if (!getDeletePermission(table, user)) {
    return { error: getDeleteErrorMessage(table) };
  }

  const passwordValidation = await verifyConfirmationPassword(password);

  if (!passwordValidation.ok) {
    return { error: passwordValidation.reason };
  }

  const { error } = await deleteRecord(table, id);

  if (error) {
    return { error: mapDeleteDatabaseError(error.message, table) };
  }

  return { success: true };
}

export async function deleteZonaAction(input: {
  zonaId: number;
  password: string;
}): Promise<ActionResult> {
  return deleteWithConfirmation("zona", input.zonaId, input.password);
}

export async function deleteSectorAction(input: {
  sectorId: number;
  password: string;
}): Promise<ActionResult> {
  return deleteWithConfirmation("sectores", input.sectorId, input.password);
}

export async function deleteFincaAction(input: {
  fincaId: number;
  password: string;
}): Promise<ActionResult> {
  return deleteWithConfirmation("fincas", input.fincaId, input.password);
}

export async function deletePropiedadAction(input: {
  propiedadId: number;
  password: string;
}): Promise<ActionResult> {
  return deleteWithConfirmation("propiedades", input.propiedadId, input.password);
}

export async function updateDeleteConfirmationPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const user = await getCurrentUserContext();

  if (!user) {
    return { error: "Tu sesión no es válida. Vuelve a iniciar sesión." };
  }

  if (!user.canManageConfirmationPassword) {
    return {
      error: "Solo un Administrador puede actualizar la contraseña de confirmación.",
    };
  }

  const nextPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword.trim();

  if (!nextPassword) {
    return { error: "Debes introducir una nueva contraseña de confirmación." };
  }

  const passwordError = validatePassword(nextPassword);
  if (passwordError) {
    return { error: `La contraseña no cumple los requisitos: ${passwordError}.` };
  }

  if (nextPassword !== confirmPassword) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }

  const currentStatus = await getConfirmationPasswordStatus();

  if (currentStatus.configured) {
    const currentValidation = await verifyConfirmationPassword(input.currentPassword);

    if (!currentValidation.ok) {
      return { error: "La contraseña de confirmación actual no es correcta." };
    }
  }

  try {
    await saveConfirmationPassword(nextPassword, user.id);
    return { success: true };
  } catch (error) {
    const rawMessage = getErrorMessage(error);
    const message =
      rawMessage.includes("configuracion_seguridad") ||
      rawMessage.includes("Could not find the table") ||
      rawMessage.includes("relation")
        ? "Falta aplicar la migración de seguridad en Supabase antes de guardar la contraseña de confirmación."
        : rawMessage;

    return { error: message };
  }
}
