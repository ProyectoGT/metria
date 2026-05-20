import { NextRequest } from "next/server";

export const GOOGLE_REDIRECT_PATH = "/api/google/callback" as const;

export function getGoogleRedirectUri(request: NextRequest) {
  const origin = new URL(request.url).origin;
  return `${origin}${GOOGLE_REDIRECT_PATH}`;
}

export function getCallbackOrigin(request: NextRequest) {
  return new URL(request.url).origin;
}
