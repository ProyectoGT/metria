import { createClient } from "@/lib/supabase-browser";
import { throwIfSupabaseError } from "@/modules/shared/services/service-errors";
import type { ContactsListFilters } from "@/lib/query-keys";
import type { Tables } from "@/types/database.types";

export type ContactRow = Tables<"contactos">;

const CONTACT_SELECT =
  "id,nombre,apellidos,empresa,cargo,tipo,email,telefono,telefono_secundario,direccion,ciudad,provincia,codigo_postal,pais,notas,origen,estado,owner_user_id,empresa_id,equipo_id,visibility,created_at,updated_at,archived_at";

async function list(filters: ContactsListFilters): Promise<ContactRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("contactos")
    .select(CONTACT_SELECT)
    .is("archived_at", null)
    .order("nombre", { ascending: true });

  if (filters.empresaId != null) query = query.eq("empresa_id", filters.empresaId);
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.ownerUserId != null) query = query.eq("owner_user_id", filters.ownerUserId);
  if (filters.search?.trim()) {
    const value = filters.search.trim();
    query = query.or(`nombre.ilike.%${value}%,apellidos.ilike.%${value}%,email.ilike.%${value}%`);
  }

  const { data, error } = await query;
  throwIfSupabaseError(error, "No se pudieron cargar los contactos");
  return data ?? [];
}

async function detail(contactId: number): Promise<ContactRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contactos")
    .select(CONTACT_SELECT)
    .eq("id", contactId)
    .maybeSingle();

  throwIfSupabaseError(error, "No se pudo cargar el contacto");
  return data;
}

export const contactsService = {
  list,
  detail,
};
