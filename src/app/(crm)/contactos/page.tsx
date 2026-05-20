import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Contacto } from "@/types";
import { canAccessContactos } from "@/lib/roles";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import PageHeader from "@/components/layout/page-header";
import ContactosClient from "./contactos-client";

export default async function ContactosPage() {
  const supabase = await createClient();
  const yo = await requirePageAccess("contactos");

  if (!yo) {
    redirect("/login");
  }

  const role = yo?.role ?? "Agente";
  if (!canAccessContactos(role)) {
    redirect("/dashboard");
  }

  const userId = yo?.id ?? 0;

  // La RLS ya filtra por empresa y visibilidad; el filtro explícito es
  // un índice hint adicional que acelera la query.
  let query = supabase
    .from("contactos")
    .select("id,nombre,apellidos,empresa,cargo,tipo,email,telefono,telefono_secundario,direccion,ciudad,provincia,codigo_postal,pais,notas,origen,estado,owner_user_id,empresa_id,equipo_id,visibility,created_at,updated_at,archived_at")
    .is("archived_at", null)
    .order("nombre");

  if (yo?.empresaId != null) {
    query = query.eq("empresa_id", yo.empresaId);
  }

  // Agentes solo ven los suyos + company visibility (RLS lo garantiza,
  // pero añadimos filtro extra para reducir filas transferidas)
  if (role === "Agente") {
    query = query.or(`owner_user_id.eq.${userId},visibility.eq.company`);
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
