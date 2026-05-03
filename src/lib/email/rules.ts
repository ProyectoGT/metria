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
