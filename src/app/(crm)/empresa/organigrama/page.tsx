import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { canViewOrgChart } from "@/lib/roles";
import PageHeader from "@/components/layout/page-header";
import OrganigramaClient from "./organigrama-client";
import type { OrgUser } from "@/modules/empresa/services/org-chart";

export default async function OrganigramaPage() {
  const yo = await getCurrentUserContext();

  if (!yo) redirect("/login");

  // Solo Administrador, Director y Responsable pueden ver el organigrama
  if (!canViewOrgChart(yo.role)) redirect("/dashboard");

  const supabase = await createClient();

  // Cargamos usuarios + equipo en paralelo, filtrando por empresa vía RLS
  const [{ data: usersData }, { data: equiposData }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, apellidos, correo, rol, estado, supervisor_id, equipo_id, empresa_id")
      .eq("empresa_id", yo.empresaId ?? -1)
      .order("rol")
      .order("nombre"),
    supabase
      .from("equipos")
      .select("id, nombre")
      .eq("empresa_id", yo.empresaId ?? -1),
  ]);

  const equipoMap = new Map(
    (equiposData ?? []).map((e) => [e.id, e.nombre])
  );

  type UserRow = {
    id: number;
    nombre: string;
    apellidos: string;
    correo: string;
    rol: string | null;
    estado: string | null;
    supervisor_id: number | null;
    equipo_id: number | null;
    empresa_id: number | null;
  };

  // Responsable solo ve a sus supervisados (y a sí mismo)
  // Admin/Director ven a todos los usuarios de la empresa
  const allUsers = (usersData ?? []) as UserRow[];
  const visibleUsers =
    yo.role === "Responsable"
      ? allUsers.filter(
          (u) => u.id === yo.id || u.supervisor_id === yo.id
        )
      : allUsers;

  const users: OrgUser[] = visibleUsers
    .filter((u) => {
      const r = (u.rol ?? "").toLowerCase();
      return r !== "administrador" && r !== "admin";
    })
    .map((u) => ({
    id: u.id,
    nombre: u.nombre,
    apellidos: u.apellidos,
    correo: u.correo,
    rol: u.rol ?? "Agente",
    estado: (u.estado ?? "active") as OrgUser["estado"],
    supervisorId: u.supervisor_id,
    equipoId: u.equipo_id,
    equipoNombre: u.equipo_id ? (equipoMap.get(u.equipo_id) ?? null) : null,
  }));

  return (
    <>
      <PageHeader
        title="Organigrama"
        description="Estructura jerarquica del equipo de la empresa."
      />
      <OrganigramaClient users={users} />
    </>
  );
}
