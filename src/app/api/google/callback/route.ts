import { NextRequest, NextResponse } from "next/server";
import { getCallbackOrigin, GOOGLE_REDIRECT_PATH } from "@/lib/google-redirect";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { encryptSecret } from "@/lib/email/crypto";
import { exchangeGmailCode, getGmailProfile } from "@/lib/email/gmail";

// ─── Flujo Calendar ───────────────────────────────────────────────────────

async function handleCalendar(code: string, origin: string) {
  const redirectUri = `${origin}${GOOGLE_REDIRECT_PATH}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/calendario?error=token_failed`);
  }

  const response = NextResponse.redirect(`${origin}/calendario`);

  response.cookies.set("google_access_token", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: tokens.expires_in ?? 3600,
    path: "/",
    sameSite: "lax",
  });

  if (tokens.refresh_token) {
    response.cookies.set("google_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

// ─── Flujo Gmail Idealista ────────────────────────────────────────────────

async function handleGmailIdealista(code: string, origin: string) {
  const redirectUri = `${origin}${GOOGLE_REDIRECT_PATH}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/solicitudes?gmail_error=token_failed`);
  }

  const response = NextResponse.redirect(`${origin}/solicitudes?tab=idealista&gmail_connected=1`);

  response.cookies.set("gmail_access_token", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: tokens.expires_in ?? 3600,
    path: "/",
    sameSite: "lax",
  });

  if (tokens.refresh_token) {
    response.cookies.set("gmail_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

// ─── Flujo Gmail Full (Email System) ──────────────────────────────────────

async function handleGmailFull(code: string, origin: string) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.redirect(`${origin}/login`);

  const redirectUri = `${origin}${GOOGLE_REDIRECT_PATH}`;
  const tokens = await exchangeGmailCode(code, redirectUri);
  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/cuenta?email_error=token_failed`);
  }

  const profile = await getGmailProfile(tokens.access_token);
  const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  const supabase = await createClient();

  const payload = {
    empresa_id: currentUser.empresaId,
    user_id: currentUser.id,
    provider: "gmail",
    email: profile.emailAddress,
    status: "connected",
    access_token_encrypted: encryptSecret(tokens.access_token),
    refresh_token_encrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined,
    token_expires_at: tokenExpiresAt,
    last_error: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any)
    .from("email_accounts")
    .upsert(payload, { onConflict: "user_id,provider,email" });

  if (upsertError) {
    return NextResponse.redirect(`${origin}/cuenta?email_error=save_failed`);
  }

  const response = NextResponse.redirect(`${origin}/cuenta?email_connected=1`);
  response.cookies.delete("metria_gmail_oauth_state");
  return response;
}

// ─── Callback unificado ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const origin = getCallbackOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Error de Google (usuario denegó)
  if (error) {
    if (state === "calendar") return NextResponse.redirect(`${origin}/calendario?error=access_denied`);
    if (state === "gmail_idealista") return NextResponse.redirect(`${origin}/solicitudes?gmail_error=access_denied`);
    return NextResponse.redirect(`${origin}/cuenta?email_error=access_denied`);
  }

  if (!code) {
    if (state === "calendar") return NextResponse.redirect(`${origin}/calendario?error=access_denied`);
    if (state === "gmail_idealista") return NextResponse.redirect(`${origin}/solicitudes?gmail_error=access_denied`);
    return NextResponse.redirect(`${origin}/cuenta?email_error=access_denied`);
  }

  // ── Calendar ──
  if (state === "calendar") {
    return handleCalendar(code, origin);
  }

  // ── Gmail Idealista ──
  if (state === "gmail_idealista") {
    return handleGmailIdealista(code, origin);
  }

  // ── Gmail Full (Email System) ──
  // state debe ser "email_" + CSRF token
  if (state?.startsWith("email_")) {
    const cookieState = request.cookies.get("metria_gmail_oauth_state")?.value;
    const csrfToken = state.slice(6);
    if (csrfToken !== cookieState) {
      return NextResponse.redirect(`${origin}/cuenta?email_error=access_denied`);
    }
    return handleGmailFull(code, origin);
  }

  // State desconocido → error
  return NextResponse.redirect(`${origin}/?oauth_error=invalid_state`);
}
