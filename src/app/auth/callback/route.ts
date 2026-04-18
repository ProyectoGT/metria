import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const adminClient = createAdminClient();

      // Buscar perfil por auth_id o por correo
      const { data: byAuthId } = await adminClient
        .from("usuarios")
        .select("id, auth_id, estado")
        .eq("auth_id", data.user.id)
        .maybeSingle();

      let profile = byAuthId;

      if (!profile && data.user.email) {
        const { data: byEmail } = await adminClient
          .from("usuarios")
          .select("id, auth_id, estado")
          .eq("correo", data.user.email)
          .maybeSingle();

        if (byEmail) {
          // Vincular auth_id si el perfil existía sin él (creado con opcion Google)
          if (!byEmail.auth_id) {
            await adminClient
              .from("usuarios")
              .update({ auth_id: data.user.id })
              .eq("id", byEmail.id);
          }
          profile = byEmail;
        }
      }

      if (!profile) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=no_profile`);
      }

      if (profile.estado === "disabled") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=disabled`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
