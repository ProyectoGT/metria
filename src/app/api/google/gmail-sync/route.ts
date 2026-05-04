import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";
import { canViewIdealistaLeads } from "@/lib/roles";

// ─── Token helpers ────────────────────────────────────────────────────────────

async function getGmailToken(): Promise<{ token: string; refreshed?: string } | null> {
  const cookieStore = await cookies();
  const access = cookieStore.get("gmail_access_token")?.value;
  if (access) return { token: access };

  const refresh = cookieStore.get("gmail_refresh_token")?.value;
  if (!refresh) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) return null;
  return { token: data.access_token, refreshed: data.access_token };
}

function setRefreshedGmailToken(response: NextResponse, token: string) {
  response.cookies.set("gmail_access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600,
    path: "/",
    sameSite: "lax",
  });
}

// ─── Gmail API helpers ────────────────────────────────────────────────────────

async function gmailFetch(path: string, token: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function decodeBase64(data: string): string {
  try {
    // Gmail uses URL-safe base64
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

// Extract plain text or HTML from a Gmail message payload
function extractBody(payload: GmailPayload): string {
  // Direct body
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Look in parts
  if (payload.parts) {
    // Prefer text/plain
    const plain = payload.parts.find((p) => p.mimeType === "text/plain");
    if (plain?.body?.data) return decodeBase64(plain.body.data);

    const html = payload.parts.find((p) => p.mimeType === "text/html");
    if (html?.body?.data) return decodeBase64(html.body.data);

    // Recurse into multipart/alternative
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }
  return "";
}

// Strip HTML tags and normalize whitespace
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|td|th)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Idealista email parser ───────────────────────────────────────────────────

interface ParsedLead {
  nombre: string | null;
  email_contacto: string | null;
  telefono: string | null;
  mensaje: string | null;
  referencia: string | null;
  url_propiedad: string | null;
  titulo_propiedad: string | null;
}

function parseIdealistaEmail(rawBody: string, subject: string): ParsedLead {
  // Work on plain text — strip HTML if needed
  const text = rawBody.includes("<") ? stripHtml(rawBody) : rawBody;

  // Email address
  const emailMatch = text.match(/\b[\w.+%-]+@[\w-]+\.[\w.]{2,}\b/);
  const email_contacto = emailMatch?.[0] ?? null;

  // Spanish phone (mobile or landline, optional +34 prefix)
  const phoneMatch = text.match(/(?:\+34[\s.-]?)?(?:[6-9]\d{2})[\s.-]?\d{3}[\s.-]?\d{3}/);
  const telefono = phoneMatch?.[0]?.replace(/[\s.-]/g, "") ?? null;

  // Idealista property URL
  const urlMatch = text.match(/https?:\/\/(?:www\.)?idealista\.com\/[^\s"'<>\n]+/i);
  const url_propiedad = urlMatch?.[0]?.split(/['">\s]/)[0] ?? null;

  // Property reference number (e.g. "Ref.: 12345678" or "referencia: 12345678")
  const refMatch = text.match(/(?:ref(?:erencia)?\.?\s*[:\-]?\s*)(\d{5,})/i);
  const referencia = refMatch?.[1] ?? null;

  // Contact name — Idealista uses several patterns
  const namePatterns = [
    /(?:nombre|name|contacto)\s*[:\-]\s*([^\n\r,]{2,60})/i,
    /(?:ha\s+contactado|se\s+ha\s+puesto\s+en\s+contacto)[^\n]*:\s*([^\n\r,]{2,60})/i,
    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\s*(?:\n|ha\s+contactado)/m,
  ];
  let nombre: string | null = null;
  for (const pattern of namePatterns) {
    const m = text.match(pattern);
    if (m?.[1]) { nombre = m[1].trim(); break; }
  }

  // Message body — text after "Mensaje:" or "Comentario:"
  const msgPatterns = [
    /(?:mensaje|comentario|texto|message|comments?)\s*[:\-]\s*([\s\S]{5,}?)(?=\n\n|\r\n\r\n|$)/i,
    /(?:ha\s+escrito|writes?):\s*([\s\S]{5,}?)(?=\n\n|$)/i,
  ];
  let mensaje: string | null = null;
  for (const pattern of msgPatterns) {
    const m = text.match(pattern);
    const candidate = m?.[1]?.trim();
    if (candidate && candidate.length > 4) { mensaje = candidate.slice(0, 1000); break; }
  }

  // Property title — often the line above the URL or after "Inmueble:" / "Propiedad:"
  const titleMatch = text.match(/(?:inmueble|propiedad|piso|casa|local|anuncio)\s*[:\-]\s*([^\n\r]{5,120})/i);
  const titulo_propiedad = titleMatch?.[1]?.trim() ?? null;

  // Fallback: use subject to extract title
  const subjectTitle = subject
    .replace(/nuevo\s+contacto.*?(para|en|de)\s*/i, "")
    .replace(/idealista\.?com\s*/i, "")
    .trim() || null;

  return {
    nombre,
    email_contacto,
    telefono,
    mensaje,
    referencia,
    url_propiedad,
    titulo_propiedad: titulo_propiedad ?? subjectTitle,
  };
}

// ─── Gmail message types ──────────────────────────────────────────────────────

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
  headers?: { name: string; value: string }[];
}

interface GmailMessage {
  id: string;
  payload?: GmailPayload;
  internalDate?: string;
}

// ─── POST /api/google/gmail-sync ─────────────────────────────────────────────

export async function POST() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!canViewIdealistaLeads(currentUser.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const auth = await getGmailToken();
  if (!auth) {
    return NextResponse.json({ error: "gmail_not_connected" }, { status: 401 });
  }

  const empresa_id = currentUser.empresaId;

  // Search Gmail for Idealista notification emails (last 3 months)
  const after = Math.floor(Date.now() / 1000 - 90 * 24 * 3600);
  const query = encodeURIComponent(
    `from:idealista.com after:${after}`
  );

  const listData = await gmailFetch(
    `/users/me/messages?q=${query}&maxResults=50`,
    auth.token
  );

  if (!listData?.messages?.length) {
    const response = NextResponse.json({ imported: 0, message: "No se encontraron emails de Idealista" });
    if (auth.refreshed) setRefreshedGmailToken(response, auth.refreshed);
    return response;
  }

  const messageIds: string[] = listData.messages.map((m: { id: string }) => m.id);

  // Check which message IDs are already in DB
  const adminSupabase = createAdminClient();
  const { data: existing } = await adminSupabase
    .from("idealista_leads")
    .select("gmail_message_id")
    .in("gmail_message_id", messageIds);

  const existingIds = new Set((existing ?? []).map((r) => r.gmail_message_id));
  const newIds = messageIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) {
    const response = NextResponse.json({ imported: 0, message: "Todo ya sincronizado" });
    if (auth.refreshed) setRefreshedGmailToken(response, auth.refreshed);
    return response;
  }

  type LeadInsert = {
    gmail_message_id: string;
    asunto: string;
    fecha_contacto: string | null;
    empresa_id: number | null;
    nombre: string | null;
    email_contacto: string | null;
    telefono: string | null;
    mensaje: string | null;
    referencia: string | null;
    url_propiedad: string | null;
    titulo_propiedad: string | null;
  };

  // Fetch and parse new messages
  const leadsToInsert: LeadInsert[] = [];

  for (const msgId of newIds) {
    const msg: GmailMessage | null = await gmailFetch(
      `/users/me/messages/${msgId}?format=full`,
      auth.token
    );
    if (!msg?.payload) continue;

    const headers = msg.payload.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    const dateHeader = headers.find((h) => h.name === "Date")?.value ?? "";

    const rawBody = extractBody(msg.payload);
    const parsed = parseIdealistaEmail(rawBody, subject);

    const fecha_contacto = dateHeader
      ? new Date(dateHeader).toISOString()
      : msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : null;

    leadsToInsert.push({
      gmail_message_id: msgId,
      asunto: subject,
      fecha_contacto,
      empresa_id,
      ...parsed,
    });
  }

  if (leadsToInsert.length === 0) {
    const response = NextResponse.json({ imported: 0, message: "Emails encontrados pero sin datos parseables" });
    if (auth.refreshed) setRefreshedGmailToken(response, auth.refreshed);
    return response;
  }

  const { data: inserted, error } = await adminSupabase
    .from("idealista_leads")
    .insert(leadsToInsert)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({
    imported: inserted?.length ?? 0,
    leads: inserted,
  });
  if (auth.refreshed) setRefreshedGmailToken(response, auth.refreshed);
  return response;
}

// GET — just check connection status
export async function GET() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!canViewIdealistaLeads(currentUser.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const auth = await getGmailToken();
  const connected = !!auth;
  return NextResponse.json({ connected });
}
