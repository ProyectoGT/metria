import { NextRequest, NextResponse } from "next/server";
import { getCallbackOrigin } from "@/lib/google-redirect";

// ─── Redirigir al callback unificado ────────────────────────────────────
// Este endpoint se ha consolidado en /api/google/callback.
// Si llegas aquí, el flujo OAuth original ya no está activo.
// Google debería redirigir a /api/google/callback vía state=email_<CSRF>.

export async function GET(request: NextRequest) {
  const origin = getCallbackOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/cuenta?email_error=access_denied`);
  }

  // Reintento: redirigir al callback unificado con el state original
  const callbackUrl = new URL(`${origin}/api/google/callback`);
  callbackUrl.searchParams.set("code", code);
  if (state) callbackUrl.searchParams.set("state", state);
  if (error) callbackUrl.searchParams.set("error", error);

  return NextResponse.redirect(callbackUrl.toString());
}
