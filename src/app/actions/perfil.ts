"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";

type ActionResult = {
  success?: boolean;
  error?: string;
};

export async function updateProfileAction(input: {
  nombre: string;
}): Promise<ActionResult> {
  const user = await getCurrentUserContext();
  if (!user) {
    return { error: "Tu sesión no es válida. Vuelve a iniciar sesión." };
  }

  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre es obligatorio." };

  const supabase = await createClient();

  const parts = nombre.split(/\s+/);
  const nombreSolo = parts[0];
  const apellidos = parts.slice(1).join(" ");

  const { error: dbError } = await supabase
    .from("usuarios")
    .update({ nombre: nombreSolo, apellidos })
    .eq("id", user.id);

  if (dbError) return { error: dbError.message };

  revalidatePath("/cuenta");
  return { success: true };
}

export async function updatePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const newPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword.trim();
  const currentPassword = input.currentPassword.trim();

  if (!currentPassword) {
    return { error: "Introduce tu contraseña actual." };
  }
  if (newPassword.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Tu sesión no es válida. Vuelve a iniciar sesión." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: "La contraseña actual no es correcta." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: true };
}

export async function saveAvatarUrlAction(avatarUrl: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión no es válida." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  if (error) return { error: error.message };

  revalidatePath("/cuenta");
  return { success: true };
}
