import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  if (!placeId) return NextResponse.json({ location: null });

  const key = process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "API key no configurada", location: null });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${key}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status && data.status !== "OK") {
      return NextResponse.json({ error: `Google Geocoding: ${data.status} — ${data.error_message ?? ""}`, location: null });
    }

    const loc = data.results?.[0]?.geometry?.location ?? null;
    return NextResponse.json({ location: loc });
  } catch {
    return NextResponse.json({ error: "Error al contactar Google Geocoding", location: null });
  }
}
