import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { encryptSecret } from "@/lib/email/crypto";
import { exchangeGmailCode, getGmailProfile } from "@/lib/email/gmail";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("metria_gmail_oauth_state")?.value;

  if (error || !code || !state || state !== cookieState) {
    return NextResponse.redirect(`${origin}/cuenta?email_error=access_denied`);
  }

  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.redirect(`${origin}/login`);

  const redirectUri = `${origin}/api/email/gmail/callback`;
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
