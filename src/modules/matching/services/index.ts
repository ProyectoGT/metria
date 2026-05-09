export type MatchPedido = {
  id: number;
  nombre_cliente: string;
  tipo_propiedad: string | null;
  zona_busqueda: string | null;
  presupuesto: number | null;
  modalidad: string | null;
  habitaciones: number | null;
  banos: number | null;
  garaje: boolean | null;
  altura_deseada: string | null;
  notas: string | null;
};

export type MatchPropiedad = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  estado: string | null;
  notas: string | null;
  honorarios: number | null;
  finca_id: number | null;
  fincas?: {
    id: number;
    numero: string | null;
    sectores?: {
      id: number;
      numero: number | null;
      zona_id: number | null;
      zona?: { id: number; nombre: string | null } | null;
    } | null;
  } | null;
};

export type PropertyMatch = {
  propiedad: MatchPropiedad;
  score: number;
  razones: string[];
};

const AVAILABLE_STATES = new Set(["noticia", "investigacion", "investigación", "encargo", "neutral"]);
const STOP_WORDS = new Set([
  "con", "para", "por", "una", "uno", "del", "las", "los", "que", "como", "este",
  "esta", "zona", "piso", "casa", "cliente", "busca", "tiene", "sin", "mas", "más",
]);

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function tokenize(value: string | null | undefined) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => needle && haystack.includes(needle));
}

function propertyLabel(propiedad: MatchPropiedad) {
  if (propiedad.propietario?.trim()) return propiedad.propietario.trim();
  const parts = [propiedad.planta && `Planta ${propiedad.planta}`, propiedad.puerta && `Puerta ${propiedad.puerta}`].filter(Boolean);
  return parts.length ? parts.join(" ") : `Propiedad #${propiedad.id}`;
}

function propertySearchText(propiedad: MatchPropiedad) {
  return normalizeText([
    propertyLabel(propiedad),
    propiedad.estado,
    propiedad.notas,
    propiedad.planta,
    propiedad.puerta,
    propiedad.fincas?.numero,
    propiedad.fincas?.sectores?.numero != null ? `sector ${propiedad.fincas.sectores.numero}` : null,
    propiedad.fincas?.sectores?.zona?.nombre,
  ].filter(Boolean).join(" "));
}

function pedidoSearchText(pedido: MatchPedido) {
  return normalizeText([
    pedido.tipo_propiedad,
    pedido.zona_busqueda,
    pedido.modalidad,
    pedido.altura_deseada,
    pedido.notas,
  ].filter(Boolean).join(" "));
}

function isAvailable(propiedad: MatchPropiedad) {
  const estado = normalizeText(propiedad.estado);
  if (!estado) return true;
  if (estado.includes("vendid") || estado.includes("cancel") || estado.includes("baja")) return false;
  return AVAILABLE_STATES.has(estado) || estado.includes("encarg") || estado.includes("investig");
}

export function calculatePropertyMatchScore(pedido: MatchPedido, propiedad: MatchPropiedad): PropertyMatch {
  const razones: string[] = [];
  let score = 0;

  if (isAvailable(propiedad)) {
    score += 25;
    razones.push("Propiedad disponible");
  } else {
    razones.push("Estado no disponible");
    return { propiedad, score: 0, razones };
  }

  const propText = propertySearchText(propiedad);
  const pedidoText = pedidoSearchText(pedido);

  const zonaTokens = tokenize(pedido.zona_busqueda);
  const zonaNombre = normalizeText(propiedad.fincas?.sectores?.zona?.nombre);
  if (zonaTokens.length && (includesAny(propText, zonaTokens) || includesAny(zonaNombre, zonaTokens))) {
    score += 30;
    razones.push("Coincide con la zona buscada");
  } else if (!zonaTokens.length) {
    score += 8;
    razones.push("Sin zona restrictiva en la solicitud");
  }

  const tipoTokens = tokenize(pedido.tipo_propiedad);
  if (tipoTokens.length && includesAny(propText, tipoTokens)) {
    score += 15;
    razones.push("Coincide el tipo de propiedad indicado");
  } else if (!tipoTokens.length) {
    score += 5;
    razones.push("Sin tipo de propiedad restrictivo");
  }

  if (pedido.presupuesto) {
    const numericText = propText.match(/\d{5,}/g)?.map((n) => Number(n)) ?? [];
    const likelyPrice = numericText.find((value) => value > 10000);
    if (likelyPrice) {
      const maxBudget = pedido.presupuesto * 1.1;
      if (likelyPrice <= maxBudget) {
        score += 15;
        razones.push("Encaja en el presupuesto aproximado");
      } else {
        razones.push("Precio textual por encima del presupuesto");
      }
    } else {
      score += 5;
      razones.push("Sin precio comparable en la propiedad");
    }
  } else {
    score += 5;
    razones.push("Sin presupuesto restrictivo");
  }

  const pedidoTokens = tokenize(pedidoText);
  const propTokens = new Set(tokenize(propText));
  const overlap = pedidoTokens.filter((token) => propTokens.has(token));
  if (overlap.length > 0) {
    const points = Math.min(15, overlap.length * 5);
    score += points;
    razones.push(`Coincidencia textual: ${overlap.slice(0, 4).join(", ")}`);
  }

  return {
    propiedad,
    score: Math.max(0, Math.min(100, Math.round(score))),
    razones,
  };
}

export function calculatePropertyMatches(
  pedido: MatchPedido,
  propiedades: MatchPropiedad[],
  options: { minScore?: number; limit?: number } = {},
) {
  const minScore = options.minScore ?? 20;
  const limit = options.limit ?? 10;
  return propiedades
    .map((propiedad) => calculatePropertyMatchScore(pedido, propiedad))
    // score=0 significa "propiedad no disponible" — siempre excluir
    .filter((match) => match.score > 0 && match.score >= minScore)
    .sort((a, b) => b.score - a.score || a.propiedad.id - b.propiedad.id)
    .slice(0, limit);
}
