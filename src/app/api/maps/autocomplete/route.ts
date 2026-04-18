import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input) return NextResponse.json({ predictions: [] });

  const key = process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "API key no configurada", predictions: [] });

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=es&key=${key}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ error: `Google Places: ${data.status} — ${data.error_message ?? ""}`, predictions: [] });
    }

    return NextResponse.json({ predictions: data.predictions ?? [] });
  } catch {
    return NextResponse.json({ error: "Error al contactar Google Places", predictions: [] });
  }
}
