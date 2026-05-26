"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Contacto } from "@/types";

const CONTACT_SELECT =
  "id,nombre,apellidos,empresa,cargo,tipo,email,telefono,telefono_secundario,direccion,ciudad,provincia,codigo_postal,pais,notas,origen,estado,owner_user_id,empresa_id,equipo_id,visibility,created_at,updated_at,archived_at";

type ContactActionResult =
  | { success: true; data?: Contacto; dataList?: Contacto[] }
  | { success: false; error: string };

function canManageContact(args: {
  role: string;
  currentUserId: number;
  ownerUserId: number | null;
  empresaId: number | null;
  currentEmpresaId: number | null;
}) {
  if (args.empresaId === null || args.empresaId !== args.currentEmpresaId) return false;
  return (
    args.role === "Administrador" ||
    args.role === "Director" ||
    args.ownerUserId === args.currentUserId
  );
}

function canReadArchivedContact(args: {
  role: string;
  currentUserId: number;
  currentEquipoId: number | null;
  ownerUserId: number | null;
  empresaId: number | null;
  equipoId: number | null;
  visibility: string | null;
  currentEmpresaId: number | null;
}) {
  if (args.empresaId === null || args.empresaId !== args.currentEmpresaId) return false;
  if (args.role === "Administrador" || args.role === "Director") return true;
  if (args.ownerUserId === args.currentUserId) return true;
  if (args.visibility === "company") return true;
  return args.visibility === "team" && args.equipoId !== null && args.equipoId === args.currentEquipoId;
}

export async function archiveContactAction(contactId: number): Promise<ContactActionResult> {
  const yo = await getCurrentUserContext();
  if (!yo) return { success: false, error: "No autenticado" };
  if (!Number.isInteger(contactId) || contactId <= 0) {
    return { success: false, error: "Contacto no valido" };
  }

  const supabase = createAdminClient();
  const { data: contact, error: readError } = await supabase
    .from("contactos")
    .select("id, owner_user_id, empresa_id")
    .eq("id", contactId)
    .maybeSingle();

  if (readError) return { success: false, error: readError.message };
  if (!contact) return { success: false, error: "El contacto no existe" };
  if (
    !canManageContact({
      role: yo.role,
      currentUserId: yo.id,
      ownerUserId: contact.owner_user_id,
      empresaId: contact.empresa_id,
      currentEmpresaId: yo.empresaId,
    })
  ) {
    return { success: false, error: "No tienes permisos para archivar este contacto" };
  }

  const { error: updateError } = await supabase
    .from("contactos")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", contactId);

  if (updateError) return { success: false, error: updateError.message };
  revalidatePath("/contactos");
  return { success: true };
}

export async function restoreContactAction(contactId: number): Promise<ContactActionResult> {
  const yo = await getCurrentUserContext();
  if (!yo) return { success: false, error: "No autenticado" };
  if (!Number.isInteger(contactId) || contactId <= 0) {
    return { success: false, error: "Contacto no valido" };
  }

  const supabase = createAdminClient();
  const { data: contact, error: readError } = await supabase
    .from("contactos")
    .select("id, owner_user_id, empresa_id")
    .eq("id", contactId)
    .maybeSingle();

  if (readError) return { success: false, error: readError.message };
  if (!contact) return { success: false, error: "El contacto no existe" };
  if (
    !canManageContact({
      role: yo.role,
      currentUserId: yo.id,
      ownerUserId: contact.owner_user_id,
      empresaId: contact.empresa_id,
      currentEmpresaId: yo.empresaId,
    })
  ) {
    return { success: false, error: "No tienes permisos para restaurar este contacto" };
  }

  const { data: restored, error: updateError } = await supabase
    .from("contactos")
    .update({ archived_at: null })
    .eq("id", contactId)
    .select(CONTACT_SELECT)
    .single();

  if (updateError) return { success: false, error: updateError.message };
  revalidatePath("/contactos");
  return { success: true, data: restored as Contacto };
}

export async function listArchivedContactsAction(): Promise<ContactActionResult> {
  const yo = await getCurrentUserContext();
  if (!yo) return { success: false, error: "No autenticado" };
  if (yo.empresaId === null) return { success: false, error: "Usuario sin empresa asignada" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contactos")
    .select(CONTACT_SELECT)
    .eq("empresa_id", yo.empresaId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(100);

  if (error) return { success: false, error: error.message };

  const contacts = ((data ?? []) as Contacto[]).filter((contact) =>
    canReadArchivedContact({
      role: yo.role,
      currentUserId: yo.id,
      currentEquipoId: yo.equipoId,
      ownerUserId: contact.owner_user_id,
      empresaId: contact.empresa_id,
      equipoId: contact.equipo_id,
      visibility: contact.visibility,
      currentEmpresaId: yo.empresaId,
    })
  );

  return { success: true, dataList: contacts };
}
