import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { verifyVerificationToken } from "@/lib/verification";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin));
  }

  const payload = verifyVerificationToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin));
  }

  const adminClient = createAdminClient();

  const { data: user } = await adminClient
    .from("usuarios")
    .select("id, estado, auth_id, correo")
    .eq("id", payload.userId)
    .ilike("correo", payload.email)
    .maybeSingle();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", origin));
  }

  // Ya estaba activo (reenvío o doble clic)
  if (user.estado === "active") {
    return NextResponse.redirect(new URL("/login?verified=true", origin));
  }

  // disabled + auth_id != null = cuenta desactivada por el admin (no es verificación pendiente)
  if (user.estado === "disabled" && user.auth_id !== null) {
    return NextResponse.redirect(new URL("/login?error=disabled", origin));
  }

  // disabled + auth_id = null = pendiente de verificación → activar
  const { error } = await adminClient
    .from("usuarios")
    .update({ estado: "active" })
    .eq("id", user.id);

  if (error) {
    console.error("[auth/verificar] Error activando usuario:", error.message);
    return NextResponse.redirect(new URL("/login?error=verification_failed", origin));
  }

  return NextResponse.redirect(new URL("/login?verified=true", origin));
}
