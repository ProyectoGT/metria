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
  let userAvatarUrl: string | null = null;

  if (user) {
    userEmail = user.email ?? null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: profile } = await (supabase as any)
      .from("usuarios")
      .select("id, nombre, apellidos, rol, avatar_url")
      .eq("auth_id", user.id)
      .maybeSingle() as { data: { id: number; nombre: string; apellidos: string; rol: string; avatar_url: string | null } | null };

    if (!profile && user.email) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: byEmail } = await (supabase as any)
        .from("usuarios")
        .select("id, nombre, apellidos, rol, avatar_url")
        .eq("correo", user.email)
        .maybeSingle() as { data: { id: number; nombre: string; apellidos: string; rol: string; avatar_url: string | null } | null };
      profile = byEmail;
    }

    if (!profile) {
      redirect("/sin-acceso");
    }

    userName = `${profile.nombre} ${profile.apellidos}`.trim() || "Usuario";
    userRole = normalizeUserRole(profile.rol);
    userId = profile.id ?? null;
    userAvatarUrl = profile.avatar_url
      ?? (user.user_metadata?.avatar_url as string | undefined)
      ?? null;
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
      <div className="flex h-screen flex-col md:pl-[220px]">
        <Header userName={userName} userEmail={userEmail} avatarUrl={userAvatarUrl} notifications={notifications} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </>
  );
}
