"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
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
  const headersList = await headers();
  const origin = headersList.get("origin") ?? headersList.get("x-forwarded-host") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        // Fuerza pantalla de selección de cuenta de Google (útil para Workspace)
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? "No se pudo iniciar el login con Google" };
  }

  redirect(data.url);
}
