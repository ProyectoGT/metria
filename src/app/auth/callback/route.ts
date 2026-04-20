import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  function redirectToLogin(error: string) {
    const url = new URL(`/login?error=${error}`, origin);
    const resp = NextResponse.redirect(url);
    // Limpiar cookies de sesión para evitar estado inconsistente
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) resp.cookies.delete(name);
    });
    return resp;
  }

  if (!code) {
    return redirectToLogin("auth");
  }

  // Crear la respuesta de redirección ANTES de crear el cliente,
  // para que las cookies de sesión se escriban directamente sobre ella.
  const successResponse = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Las cookies se escriben sobre la respuesta que el navegador recibe
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);
    return redirectToLogin("auth");
  }

  const adminClient = createAdminClient();

  // Buscar perfil por auth_id
  const { data: byAuthId } = await adminClient
    .from("usuarios")
    .select("id, auth_id, estado, correo")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  let profile = byAuthId;

  // Si no hay perfil por auth_id, buscar por correo (insensible a mayúsculas)
  if (!profile && data.user.email) {
    const { data: byEmail, error: emailErr } = await adminClient
      .from("usuarios")
      .select("id, auth_id, estado, correo")
      .ilike("correo", data.user.email)
      .maybeSingle();

    if (emailErr) {
      console.error("[auth/callback] Error buscando por email:", emailErr.message, "email:", data.user.email);
    }

    if (byEmail) {
      // Vincular auth_id (modo "Solo Google" — primer acceso)
      if (!byEmail.auth_id) {
        const { error: updateErr } = await adminClient
          .from("usuarios")
          .update({ auth_id: data.user.id })
          .eq("id", byEmail.id);

        if (updateErr) {
          console.error("[auth/callback] Error vinculando auth_id:", updateErr.message);
        }
      }
      profile = byEmail;
    } else {
      console.error("[auth/callback] No se encontró perfil para email:", data.user.email);
    }
  }

  // Sin perfil en el CRM → bloquear
  if (!profile) {
    await supabase.auth.signOut().catch(() => {});
    return redirectToLogin("no_profile");
  }

  // Cuenta desactivada → distinguir entre "sin verificar" y "desactivada por admin"
  if (profile.estado === "disabled") {
    await supabase.auth.signOut().catch(() => {});
    // disabled + sin auth_id = pendiente de verificación de email
    // disabled + con auth_id = desactivada explícitamente por el administrador
    const esPendienteVerificacion = !profile.auth_id;
    return redirectToLogin(esPendienteVerificacion ? "pending" : "disabled");
  }

  return successResponse;
}
