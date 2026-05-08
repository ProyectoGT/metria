import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";
import ThemeScript from "./theme-script";

export type NotificationItem = {
  id: number;
  titulo: string;
  fecha: string | null;
  prioridad: string | null;
};

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser = user;

  if (!currentUser) {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user ?? null;
  }

  if (!currentUser) redirect("/login");

  const ctx = await getCurrentUserContext();

  if (!ctx) {
    redirect("/sin-acceso");
  }

  // Notificaciones: tareas pendientes del usuario actual
  let notifications: NotificationItem[] = [];
  const { data: tareas } = await supabase
    .from("tareas")
    .select("id, titulo, fecha, prioridad")
    .eq("owner_user_id", ctx.id)
    .eq("estado", "pendiente")
    .is("fecha", null)
    .is("archived_at", null)
    .order("fecha", { ascending: true, nullsFirst: false })
    .limit(8);
  notifications = (tareas ?? []) as NotificationItem[];

  const userName = `${ctx.nombre} ${ctx.apellidos}`.trim() || "Usuario";

  return (
    <>
      <ThemeScript />
      <div className="min-h-screen bg-background md:grid md:grid-cols-[220px_minmax(0,1fr)]">
        <Sidebar userRole={ctx.role} />
        <div className="flex h-screen min-w-0 flex-col">
          <Header userName={userName} userEmail={ctx.email} avatarUrl={ctx.avatarUrl} notifications={notifications} />
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
