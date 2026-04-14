import { createClient } from "@/lib/supabase";
import { normalizeUserRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";
import ThemeScript from "./theme-script";

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

  if (user) {
    userEmail = user.email ?? null;

    let { data: profile } = await supabase
      .from("usuarios")
      .select("nombre, apellidos, puesto, rol")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!profile && user.email) {
      const { data: byEmail } = await supabase
        .from("usuarios")
        .select("nombre, apellidos, puesto, rol")
        .eq("correo", user.email)
        .maybeSingle();
      profile = byEmail;
    }

    if (profile) {
      userName = `${profile.nombre} ${profile.apellidos}`.trim() || "Usuario";
      userRole = normalizeUserRole(
        (profile as { rol?: string | null }).rol ?? profile.puesto
      );
    }
  }

  return (
    <>
      <ThemeScript />
      <Sidebar userRole={userRole} />
      <div className="flex min-h-screen flex-col pl-[220px]">
        <Header userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </>
  );
}
