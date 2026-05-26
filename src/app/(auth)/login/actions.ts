"use server";

import { headers, cookies } from "next/headers";
import { createClient } from "@/lib/supabase";
import { authRateLimiter, getIp } from "@/lib/rate-limiter";
import { LoginSchema } from "@/lib/validations/auth";
import { recordLoginAudit } from "@/lib/login-audit";

type RecentSession = { name: string; email: string; avatarInitials: string };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export async function login(formData: FormData) {
  const headersList = await headers();
  const ip = getIp(headersList);

  try {
    await authRateLimiter.consume(ip);
  } catch {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Correo o contraseña no válidos." };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Verificar que el usuario tiene perfil en la base de datos
  let profile = null;
  if (data.user) {
    const { data: byAuthId } = await supabase
      .from("usuarios")
      .select("id, nombre, apellidos, rol, empresa_id")
      .eq("auth_id", data.user.id)
      .maybeSingle();

    if (!byAuthId && data.user.email) {
      const { data: byEmail } = await supabase
        .from("usuarios")
        .select("id, auth_id, nombre, apellidos, rol, empresa_id")
        .eq("correo", data.user.email)
        .maybeSingle();

      if (byEmail && !byEmail.auth_id) {
        await supabase
          .from("usuarios")
          .update({ auth_id: data.user.id })
          .eq("id", byEmail.id);
      }

      profile = byEmail;
    } else {
      profile = byAuthId;
    }
  }

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no está registrada en el sistema. Contacta con el administrador." };
  }

  await recordLoginAudit({
    userId: profile.id,
    empresaId: (profile as { empresa_id?: number | null }).empresa_id ?? null,
    userName: `${(profile as { nombre?: string }).nombre ?? ""} ${(profile as { apellidos?: string }).apellidos ?? ""}`.trim() || parsed.data.email,
    userEmail: parsed.data.email,
    userRole: (profile as { rol?: string | null }).rol ?? "Agente",
    ipAddress: ip !== "unknown" ? ip : null,
    userAgent: headersList.get("user-agent"),
  });

  // Guardar sesión reciente en cookie (httpOnly: false para lectura en cliente)
  const cookieStore = await cookies();
  const raw = cookieStore.get("recent_sessions")?.value;
  let sessions: RecentSession[] = [];
  try { sessions = JSON.parse(raw ?? "[]"); } catch { /* cookie malformada */ }

  const fullName = `${(profile as { nombre?: string }).nombre ?? ""} ${(profile as { apellidos?: string }).apellidos ?? ""}`.trim() || parsed.data.email;
  const newSession: RecentSession = {
    name: fullName,
    email: parsed.data.email,
    avatarInitials: getInitials(fullName),
  };
  sessions = [newSession, ...sessions.filter((s) => s.email !== newSession.email)].slice(0, 3);

  cookieStore.set("recent_sessions", JSON.stringify(sessions), {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return { redirectTo: "/dashboard" };
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? "No se pudo iniciar el login con Google" };
  }

  return { redirectTo: data.url };
}
