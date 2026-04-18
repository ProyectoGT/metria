import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimiter, getIp } from "@/lib/rate-limiter";
import { CreateEventSchema, DeleteEventSchema } from "@/lib/validations/calendar";

async function getAccessToken(): Promise<{ token: string; refreshed?: string } | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("google_access_token")?.value;
  if (accessToken) return { token: accessToken };

  const refreshToken = cookieStore.get("google_refresh_token")?.value;
  if (!refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) return null;
  return { token: data.access_token, refreshed: data.access_token };
}

function setRefreshedToken(response: NextResponse, token: string) {
  response.cookies.set("google_access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600,
    path: "/",
    sameSite: "lax",
  });
}

// GET — fetch events for a date range
export async function GET(request: NextRequest) {
  try { await rateLimiter.consume(getIp(request.headers)); }
  catch { return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 }); }

  const auth = await getAccessToken();
  if (!auth) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin")!;
  const timeMax = searchParams.get("timeMax")!;

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const gcalRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  const data = await gcalRes.json();
  const response = NextResponse.json(data);
  if (auth.refreshed) setRefreshedToken(response, auth.refreshed);
  return response;
}

// POST — create a new event
export async function POST(request: NextRequest) {
  try { await rateLimiter.consume(getIp(request.headers)); }
  catch { return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 }); }

  const auth = await getAccessToken();
  if (!auth) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const raw = await request.json();
  const parsed = CreateEventSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const body = parsed.data;
  const startDateTime = new Date(`${body.date}T${body.time ?? "09:00"}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

  const event = {
    summary: body.summary,
    description: body.description,
    start: { dateTime: startDateTime.toISOString(), timeZone: "Europe/Madrid" },
    end: { dateTime: endDateTime.toISOString(), timeZone: "Europe/Madrid" },
  };

  const gcalRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  const data = await gcalRes.json();
  const response = NextResponse.json(data);
  if (auth.refreshed) setRefreshedToken(response, auth.refreshed);
  return response;
}

// DELETE — remove an event by ID (passed in body)
export async function DELETE(request: NextRequest) {
  try { await rateLimiter.consume(getIp(request.headers)); }
  catch { return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 }); }

  const auth = await getAccessToken();
  if (!auth) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const raw = await request.json();
  const parsed = DeleteEventSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { eventId } = parsed.data;

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  const response = NextResponse.json({ success: true });
  if (auth.refreshed) setRefreshedToken(response, auth.refreshed);
  return response;
}
