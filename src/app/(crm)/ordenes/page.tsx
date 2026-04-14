import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import OrdenesClient from "./ordenes-client";

export default async function OrdenesPage() {
  const supabase = await createClient();
  const yo = await getCurrentUserContext();

  const { data: tareas } = await supabase
    .from("tareas")
    .select("*")
    .order("fecha", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false });

  return (
    <>
      <PageHeader
        title="Órdenes del día"
        description="Gestiona tus tareas diarias"
      />
      <OrdenesClient
        initialTareas={tareas ?? []}
        currentUserId={yo?.id ?? null}
        currentUserRole={yo?.role ?? null}
      />
    </>
  );
}
