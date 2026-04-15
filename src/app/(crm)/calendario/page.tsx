import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import CalendarioClient from "./calendario-client";

export default async function CalendarioPage() {
  const cookieStore = await cookies();
  const isConnected = !!(
    cookieStore.get("google_access_token")?.value ||
    cookieStore.get("google_refresh_token")?.value
  );

  const supabase = await createClient();
  const yo = await getCurrentUserContext();
  const userId = yo?.id ?? 0;

  const [{ data: events }, { data: tareas }] = await Promise.all([
    supabase.from("agenda").select("*").order("event_date", { ascending: true }),
    supabase
      .from("tareas")
      .select("id, titulo, prioridad, fecha, estado")
      .eq("owner_user_id", userId)
      .not("fecha", "is", null)
      .order("fecha", { ascending: true })
      .returns<{ id: number; titulo: string; prioridad: string | null; fecha: string; estado: string | null }[]>(),
  ]);

  return (
    <>
      <PageHeader title="Calendario" description="Gestiona tu agenda y actividades" />
      <CalendarioClient
        initialEvents={events ?? []}
        initialTareas={tareas ?? []}
        isConnected={isConnected}
      />
    </>
  );
}
