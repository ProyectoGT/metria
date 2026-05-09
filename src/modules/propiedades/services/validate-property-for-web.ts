export type ValidationResult = {
  score: number;
  completa: boolean;
  faltantes: string[];
  recomendaciones: string[];
};

type PropiedadInput = {
  titulo?: string | null;
  descripcion?: string | null;
  precio?: number | null;
  honorarios?: number | null;
  tipo_operacion?: string | null;
  propietario?: string | null;
  estado?: string | null;
  agente_asignado?: number | null;
  finca_id?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  telefono?: string | null;
};

const LABEL: Record<string, string> = {
  titulo:             "Titulo de la propiedad",
  descripcion:        "Descripcion para web",
  precio:             "Precio",
  tipo_operacion:     "Tipo de operacion (venta/alquiler)",
  estado_comercial:   "Estado comercial (no puede ser neutral)",
  agente_responsable: "Agente responsable asignado",
  ubicacion_finca:    "Finca / ubicacion asignada",
  coordenadas_gps:    "Coordenadas GPS (latitud/longitud)",
  nombre_propietario: "Nombre del propietario",
  telefono_propietario:"Telefono de contacto",
};

export function validatePropertyForWeb(prop: PropiedadInput): ValidationResult {
  const faltantes: string[] = [];
  const recomendaciones: string[] = [];

  // ── Campos obligatorios (7, peso: 70 pts) ──────────────────────────────
  if (!prop.titulo?.trim())                          faltantes.push("titulo");
  if (!prop.descripcion?.trim())                     faltantes.push("descripcion");
  if (!prop.precio && !prop.honorarios)              faltantes.push("precio");
  if (!prop.tipo_operacion)                          faltantes.push("tipo_operacion");
  if (!prop.estado || prop.estado === "neutral")     faltantes.push("estado_comercial");
  if (!prop.agente_asignado)                         faltantes.push("agente_responsable");
  if (!prop.finca_id)                                faltantes.push("ubicacion_finca");

  // ── Campos recomendados (3, peso: 30 pts) ─────────────────────────────
  if (!prop.latitud || !prop.longitud)               recomendaciones.push("coordenadas_gps");
  if (!prop.propietario?.trim())                     recomendaciones.push("nombre_propietario");
  if (!prop.telefono?.trim())                        recomendaciones.push("telefono_propietario");

  const baseScore  = Math.round(((7 - faltantes.length)  / 7)  * 70);
  const bonusScore = Math.round(((3 - recomendaciones.length) / 3) * 30);
  const score      = Math.max(0, Math.min(100, baseScore + bonusScore));
  const completa   = faltantes.length === 0;

  return { score, completa, faltantes, recomendaciones };
}

export function getLabelForField(field: string): string {
  return LABEL[field] ?? field;
}
