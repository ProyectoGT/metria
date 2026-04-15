import { createClient } from "@/lib/supabase";
import { normalizeUserRole } from "@/lib/roles";
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

  if (!user) redirect("/login");

  let userName = "Usuario";
  let userEmail: string | null = null;
  let userRole: ReturnType<typeof normalizeUserRole> | null = null;
  let userId: number | null = null;

  if (user) {
    userEmail = user.email ?? null;

    let { data: profile } = await supabase
      .from("usuarios")
      .select("id, nombre, apellidos, rol")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!profile && user.email) {
      const { data: byEmail } = await supabase
        .from("usuarios")
        .select("id, nombre, apellidos, rol")
        .eq("correo", user.email)
        .maybeSingle();
      profile = byEmail;
    }

    if (profile) {
      userName = `${profile.nombre} ${profile.apellidos}`.trim() || "Usuario";
      userRole = normalizeUserRole(
        (profile as { rol?: string | null }).rol
      );
      userId = (profile as { id?: number | null }).id ?? null;
    }
  }

  // Notificaciones: tareas pendientes del usuario actual
  let notifications: NotificationItem[] = [];
  if (userId) {
    const { data: tareas } = await supabase
      .from("tareas")
      .select("id, titulo, fecha, prioridad")
      .eq("owner_user_id", userId)
      .eq("estado", "pendiente")
      .order("fecha", { ascending: true, nullsFirst: false })
      .limit(8);
    notifications = (tareas ?? []) as NotificationItem[];
  }

  return (
    <>
      <ThemeScript />
      <Sidebar userRole={userRole} />
      <div className="flex min-h-screen flex-col md:pl-[220px]">
        <Header userName={userName} userEmail={userEmail} notifications={notifications} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </>
  );
}
