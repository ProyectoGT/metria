"use server";

import { createClient } from "@/lib/supabase";

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
