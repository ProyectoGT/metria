export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { requirePageAccess } from "@/lib/access-control/route-guard";
import SoporteClient from "./soporte-client";
import type { UserRole } from "@/lib/roles";

export default async function SoportePage() {
  const yo = await requirePageAccess("soporte");

  const supabase = await createClient();

  const [
    { data: contactos },
    { data: tickets },
    { data: mensajes },
  ] = await Promise.all([
    supabase.from("contactos_soporte").select("*").order("orden", { ascending: true }),
    supabase.from("tickets_soporte").select("*").order("created_at", { ascending: false }),
    supabase.from("soporte_mensajes").select("*").order("created_at", { ascending: true }),
  ]);

  // Fetch agents for assignment dropdown
  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usuarios } = await (adminClient as any)
    .from("usuarios")
    .select("id, nombre, apellidos, rol")
    .not("rol", "ilike", "admin")
    .order("nombre", { ascending: true });

  const supabaseDashboardUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.split("//")[1]?.split(".")[0] ?? ""}`
    : "#";

  return (
    <SoporteClient
      contactos={(contactos ?? []) as never[]}
      tickets={(tickets ?? []) as never[]}
      mensajes={(mensajes ?? []) as never[]}
      currentUserId={yo?.id ?? null}
      currentUserRole={yo?.role as UserRole | null}
      currentUserNombre={`${yo?.nombre ?? ""} ${yo?.apellidos ?? ""}`.trim() || "Usuario"}
      supabaseDashboardUrl={supabaseDashboardUrl}
      agents={((usuarios ?? []) as { id: number; nombre: string; apellidos: string; rol: string | null }[])
        .filter((u) => u.rol?.toLowerCase() !== "administrador")
        .map((u) => ({ id: String(u.id), nombre: `${u.nombre} ${u.apellidos}`.trim() }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
      }
    />
  );
}
