import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import Header from "@/components/layout/header";
import CalendarioClient from "./calendario-client";

export default async function CalendarioPage() {
  const cookieStore = await cookies();
  const isConnected = !!(
    cookieStore.get("google_access_token")?.value ||
    cookieStore.get("google_refresh_token")?.value
  );

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("agenda")
    .select("*")
    .order("event_date", { ascending: true });

  return (
    <>
      <Header title="Calendario" description="Gestiona tu agenda y actividades" />
      <CalendarioClient initialEvents={events ?? []} isConnected={isConnected} />
    </>
  );
}
