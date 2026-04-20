"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase";
import { authRateLimiter, getIp } from "@/lib/rate-limiter";
import { LoginSchema } from "@/lib/validations/auth";

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
      .select("id")
      .eq("auth_id", data.user.id)
      .maybeSingle();

    if (!byAuthId && data.user.email) {
      const { data: byEmail } = await supabase
        .from("usuarios")
        .select("id")
        .eq("correo", data.user.email)
        .maybeSingle();
      profile = byEmail;
    } else {
      profile = byAuthId;
    }
  }

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no está registrada en el sistema. Contacta con el administrador." };
  }

  redirect("/dashboard");
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

  redirect(data.url);
}
