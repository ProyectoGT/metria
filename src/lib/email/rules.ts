export function detectEmailIntent(message: {
  subject?: string | null;
  body_text?: string | null;
  snippet?: string | null;
}) {
  const text = `${message.subject ?? ""} ${message.snippet ?? ""} ${message.body_text ?? ""}`.toLowerCase();
  const intents = [];

  if (/(visita|ver el piso|quedar|cita|cuando puedo verlo)/i.test(text)) intents.push("solicita_visita");
  if (/(precio|cu[aá]nto|rebaja|oferta|presupuesto)/i.test(text)) intents.push("pregunta_precio");
  if (/(me interesa|interesado|interesada|encaja|quiero)/i.test(text)) intents.push("interesado");
  if (/(no me interesa|descarto|no encaja|ya no busco)/i.test(text)) intents.push("no_interesado");
  if (/(soy propietario|mi vivienda|mi piso|encargo|valoraci[oó]n)/i.test(text)) intents.push("propietario");

  const urgent = /(urgente|hoy|cuanto antes|lo antes posible|importante|prioridad)/i.test(text);
  return { intents, urgent };
}

export function detectPortalSource(message: {
  from_email?: string | null;
  subject?: string | null;
  body_text?: string | null;
  snippet?: string | null;
}) {
  const text = `${message.from_email ?? ""} ${message.subject ?? ""} ${message.snippet ?? ""} ${message.body_text ?? ""}`.toLowerCase();
  if (text.includes("idealista")) return "idealista";
  if (text.includes("fotocasa")) return "fotocasa";
  if (text.includes("habitaclia")) return "habitaclia";
  if (text.includes("yaencontre")) return "yaencontre";
  return null;
}

export function classifyAttachment(filename: string, mimeType?: string | null) {
  const name = filename.toLowerCase();
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    if (/(encargo|mandato|contrato|exclusiva)/i.test(name)) return "encargo";
    return "pdf";
  }
  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(name)) return "foto";
  if (/(dni|nota|simple|cedula|certificado|documentacion|documento)/i.test(name)) return "documentacion";
  return "otro";
}

export function scoreCommercialEmail(input: {
  direction: "inbound" | "outbound";
  isRead: boolean;
  hasAttachments: boolean;
  linkTypes: string[];
  intent: string | null;
  urgent: boolean;
  portalSource: string | null;
}) {
  if (input.direction === "outbound") {
    return { priority: 0, bucket: "personal" as const, urgency: "normal" as const, needsResponse: false, responseHours: 0 };
  }

  let priority = 10;
  let bucket: "active_client" | "hot_pedido" | "property_owner" | "related" | "personal" = "personal";

  if (input.linkTypes.includes("pedido")) {
    priority += 45;
    bucket = "hot_pedido";
  }
  if (input.linkTypes.includes("contacto")) {
    priority += 25;
    if (bucket === "personal") bucket = "active_client";
  }
  if (input.linkTypes.includes("propiedad")) {
    priority += 35;
    bucket = "property_owner";
  }
  if (input.portalSource) {
    priority += 30;
    if (bucket === "personal") bucket = "hot_pedido";
  }
  if (input.intent === "solicita_visita" || input.intent === "interesado") priority += 25;
  if (input.intent === "propietario") {
    priority += 30;
    bucket = "property_owner";
  }
  if (input.hasAttachments) priority += 8;
  if (!input.isRead) priority += 10;
  if (input.urgent) priority += 25;

  const urgency = input.urgent || priority >= 80 ? "urgent" : priority >= 50 ? "important" : "normal";
  const needsResponse = bucket !== "personal" || priority >= 40;
  const responseHours = urgency === "urgent" ? 24 : needsResponse ? 48 : 0;

  return { priority, bucket, urgency, needsResponse, responseHours };
}
