import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";

function redirectToLogin(origin: string, error: string, request: Request) {
  const url = new URL(`/login?error=${error}`, origin);
  const response = NextResponse.redirect(url);
  // Limpiar todas las cookies de sesión de Supabase
  const cookies = request.headers.get("cookie") ?? "";
  cookies.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name.startsWith("sb-")) {
      response.cookies.delete(name);
    }
  });
  return response;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return redirectToLogin(origin, "auth", request);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectToLogin(origin, "auth", request);
  }

  const adminClient = createAdminClient();

  // Buscar perfil por auth_id
  const { data: byAuthId } = await adminClient
    .from("usuarios")
    .select("id, auth_id, estado")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  let profile = byAuthId;

  // Si no hay perfil por auth_id, buscar por correo
  if (!profile && data.user.email) {
    const { data: byEmail } = await adminClient
      .from("usuarios")
      .select("id, auth_id, estado")
      .eq("correo", data.user.email)
      .maybeSingle();

    if (byEmail) {
      // Vincular auth_id si el perfil existe sin él (modo "Solo Google")
      if (!byEmail.auth_id) {
        await adminClient
          .from("usuarios")
          .update({ auth_id: data.user.id })
          .eq("id", byEmail.id);
      }
      profile = byEmail;
    }
  }

  // Sin perfil en el CRM → bloquear
  if (!profile) {
    await supabase.auth.signOut();
    return redirectToLogin(origin, "no_profile", request);
  }

  // Cuenta desactivada → bloquear
  if (profile.estado === "disabled") {
    await supabase.auth.signOut();
    return redirectToLogin(origin, "disabled", request);
  }

  return NextResponse.redirect(new URL(next, origin));
}
