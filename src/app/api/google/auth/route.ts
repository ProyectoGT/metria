import { NextRequest, NextResponse } from "next/server";
import { getGoogleRedirectUri } from "@/lib/google-redirect";

export async function GET(request: NextRequest) {
  const redirectUri = getGoogleRedirectUri(request);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", "calendar");

  return NextResponse.redirect(url.toString());
}
