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
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) resp.cookies.delete(name);
    });
    return resp;
  }

  if (!code) {
    console.error("[auth/callback] Missing code param");
    return redirectToLogin("auth");
  }

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
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user || !data.session) {
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);
    return redirectToLogin("auth");
  }

  console.log(
    "[auth/callback] Session created",
    "user:", data.user.id,
    "email:", data.user.email,
    "expires:", new Date(data.session.expires_at! * 1000).toISOString()
  );

  const adminClient = createAdminClient();

  // Buscar perfil con reintento ante error transitorio
  async function findProfile(userId: string, email: string | undefined) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: byAuthId } = await adminClient
        .from("usuarios")
        .select("id, auth_id, estado, correo")
        .eq("auth_id", userId)
        .maybeSingle();

      if (byAuthId) return byAuthId;

      if (email) {
        const { data: byEmail, error: emailErr } = await adminClient
          .from("usuarios")
          .select("id, auth_id, estado, correo")
          .ilike("correo", email)
          .maybeSingle();

        if (emailErr) {
          console.error(`[auth/callback] Email lookup error (attempt ${attempt + 1}):`, emailErr.message, "email:", email);
        }

        if (byEmail) {
          if (!byEmail.auth_id) {
            const { error: updateErr } = await adminClient
              .from("usuarios")
              .update({ auth_id: userId })
              .eq("id", byEmail.id);

            if (updateErr) {
              console.error("[auth/callback] Error vinculando auth_id:", updateErr.message);
            } else {
              console.log("[auth/callback] auth_id vinculado para usuario:", byEmail.id);
            }
          }
          return byEmail;
        }
      }

      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 300));
        console.log("[auth/callback] Retrying profile lookup...");
        continue;
      }
      break;
    }

    console.error("[auth/callback] No se encontró perfil para:", { userId, email });
    return null;
  }

  const profile = await findProfile(data.user.id, data.user.email);

  if (!profile) {
    await supabase.auth.signOut().catch(() => {});
    return redirectToLogin("no_profile");
  }

  if (profile.estado === "disabled") {
    await supabase.auth.signOut().catch(() => {});
    const esPendienteVerificacion = !profile.auth_id;
    return redirectToLogin(esPendienteVerificacion ? "pending" : "disabled");
  }

  // Verificar que la sesión es funcional antes de redirigir
  const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();

  if (verifyError || !verifySession) {
    console.error("[auth/callback] Session verification failed after exchange:", verifyError?.message);
    await supabase.auth.signOut().catch(() => {});
    return redirectToLogin("auth");
  }

  console.log("[auth/callback] Redirecting to:", next);
  return successResponse;
}
