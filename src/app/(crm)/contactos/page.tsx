import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import ContactosClient from "./contactos-client";
import type { Contacto } from "@/types";

export default async function ContactosPage() {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();

  const role = yo?.role ?? "Agente";
  const userId = yo?.id ?? 0;

  // La RLS ya filtra por empresa y visibilidad; el filtro explícito es
  // un índice hint adicional que acelera la query.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("contactos")
    .select("id,nombre,apellidos,empresa,cargo,tipo,email,telefono,telefono_secundario,direccion,ciudad,provincia,codigo_postal,pais,notas,origen,estado,owner_user_id,empresa_id,equipo_id,visibility,created_at,updated_at,archived_at")
    .is("archived_at", null)
    .order("nombre");

  if (yo?.empresaId != null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq("empresa_id", yo.empresaId);
  }

  // Agentes solo ven los suyos + company visibility (RLS lo garantiza,
  // pero añadimos filtro extra para reducir filas transferidas)
  if (role === "Agente") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).or(`owner_user_id.eq.${userId},visibility.eq.company`);
  }

  const { data: contactos } = await query;

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Agenda de contactos externos: clientes, proveedores, colaboradores y mas."
      />
      <ContactosClient
        initialContactos={(contactos ?? []) as Contacto[]}
        currentUserId={userId}
        currentUserRole={role}
      />
    </>
  );
}
