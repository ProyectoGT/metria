import { NextRequest, NextResponse } from "next/server";
import { getCallbackOrigin } from "@/lib/google-redirect";

// ─── Redirigir al callback unificado ────────────────────────────────────
// Este endpoint se ha consolidado en /api/google/callback.
// Si llegas aquí, el flujo OAuth original ya no está activo.
// Google debería redirigir a /api/google/callback vía state=gmail_idealista.

export async function GET(request: NextRequest) {
  const origin = getCallbackOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/solicitudes?gmail_error=access_denied`);
  }

  // Reintento: redirigir al callback unificado
  const callbackUrl = new URL(`${origin}/api/google/callback`);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", "gmail_idealista");
  if (error) callbackUrl.searchParams.set("error", error);

  return NextResponse.redirect(callbackUrl.toString());
}
