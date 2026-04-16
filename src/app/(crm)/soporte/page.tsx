import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import SoporteClient from "./soporte-client";

export default async function SoportePage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUserContext();

  // URL del proyecto Supabase para el panel de admin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = supabaseUrl
    .replace("https://", "")
    .replace(".supabase.co", "");
  const supabaseDashboardUrl = `https://supabase.com/dashboard/project/${projectRef}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: contactos }, { data: tickets }] = await Promise.all([
    sb.from("contactos_soporte").select("*").order("orden"),
    sb.from("tickets_soporte").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Soporte"
        description="Centro de ayuda y gestión de incidencias"
      />
      <SoporteClient
        contactos={contactos ?? []}
        tickets={tickets ?? []}
        currentUserId={currentUser?.id ?? null}
        currentUserRole={currentUser?.role ?? null}
        currentUserNombre={
          `${currentUser?.nombre ?? ""} ${currentUser?.apellidos ?? ""}`.trim()
        }
        supabaseDashboardUrl={supabaseDashboardUrl}
      />
    </>
  );
}
