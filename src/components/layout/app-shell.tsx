import { createClient } from "@/lib/supabase";
import { normalizeUserRole } from "@/lib/roles";
import { getDeniedResourceKeys } from "@/lib/access-control/can-access";
import { redirect } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";

export type NotificationItem = {
  id: number;
  titulo: string;
  fecha: string | null;
  prioridad: string | null;
  type: "tarea" | "soporte";
  href?: string;
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
  let empresaId: number | null = null;
  let deniedKeys: string[] = [];

  if (user) {
    userEmail = user.email ?? null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: profile } = await (supabase as any)
      .from("usuarios")
      .select("id, nombre, apellidos, rol, avatar_url, empresa_id")
      .eq("auth_id", user.id)
      .maybeSingle() as { data: { id: number; nombre: string; apellidos: string; rol: string; avatar_url: string | null; empresa_id: number | null } | null };

    if (!profile && user.email) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: byEmail } = await (supabase as any)
        .from("usuarios")
        .select("id, nombre, apellidos, rol, avatar_url, empresa_id")
        .eq("correo", user.email)
        .maybeSingle() as { data: { id: number; nombre: string; apellidos: string; rol: string; avatar_url: string | null; empresa_id: number | null } | null };
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
    empresaId = profile.empresa_id ?? null;

    // Cargar recursos denegados desde access_control_rules (capa configurable)
    if (empresaId && userRole) {
      const deniedSet = await getDeniedResourceKeys(empresaId, userRole);
      deniedKeys = Array.from(deniedSet);
    }
  }

  // Notificaciones: tareas pendientes + notificaciones de soporte
  let notifications: NotificationItem[] = [];
  if (userId) {
    const [{ data: tareas }, { data: soporteNotifs }] = await Promise.all([
      supabase
        .from("tareas")
        .select("id, titulo, fecha, prioridad")
        .eq("owner_user_id", userId)
        .eq("estado", "pendiente")
        .is("fecha", null)
        .is("archived_at", null)
        .order("fecha", { ascending: true, nullsFirst: false })
        .limit(5),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("soporte_notificaciones")
        .select("id, ticket_id, mensaje, created_at, tipo")
        .eq("usuario_id", userId)
        .eq("leido", false)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const tareaItems: NotificationItem[] = ((tareas ?? []) as { id: number; titulo: string; fecha: string | null; prioridad: string | null }[]).map((t) => ({
      id: t.id,
      titulo: t.titulo,
      fecha: t.fecha,
      prioridad: t.prioridad,
      type: "tarea" as const,
    }));

    const soporteItems: NotificationItem[] = ((soporteNotifs ?? []) as { id: number; ticket_id: number; mensaje: string; created_at: string; tipo: string }[]).map((n) => ({
      id: n.id,
      titulo: n.mensaje,
      fecha: n.created_at,
      prioridad: "media",
      type: "soporte" as const,
      href: `/soporte?ticket=${n.ticket_id}`,
    }));

    notifications = [...soporteItems, ...tareaItems].slice(0, 8);
  }

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <Sidebar userRole={userRole} deniedResourceKeys={deniedKeys} />
      <div className="flex h-full min-w-0 flex-col md:pl-[260px]">
        <Header userName={userName} userEmail={userEmail} avatarUrl={userAvatarUrl} notifications={notifications} />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background px-4 py-5 md:px-6 md:py-6 lg:px-7 lg:py-7">
          <div className="w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
