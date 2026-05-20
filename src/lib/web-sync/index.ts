// ─── Tipos para futura sincronización con masteriberica.cat ──────────────────
// No se conecta todavía con la web corporativa.
// Este módulo prepara la arquitectura para cuando se implemente el sync real.

export type WebSyncStatus =
  | "no_preparada"
  | "lista_para_publicar"
  | "publicada"
  | "error_sincronizacion";

export const WEB_SYNC_STATUS_LABEL: Record<WebSyncStatus, string> = {
  no_preparada:        "No preparada",
  lista_para_publicar: "Lista para publicar",
  publicada:           "Publicada",
  error_sincronizacion:"Error de sincronizacion",
};

export const WEB_SYNC_STATUS_COLOR: Record<WebSyncStatus, string> = {
  no_preparada:        "bg-surface-raised text-text-secondary",
  lista_para_publicar: "bg-primary/10 text-primary",
  publicada:           "bg-success/10 text-success",
  error_sincronizacion:"bg-danger/10 text-danger",
};

export type WebPropertyPayload = {
  id: number;
  slug: string;
  titulo: string;
  descripcion: string;
  precio: number | null;
  precio_visible: boolean;
  tipo_operacion: "venta" | "alquiler" | "venta_alquiler";
  estado: string;
  zona: string;
  sector: string;
  finca: string;
  latitud: number | null;
  longitud: number | null;
  web_destacada: boolean;
  agente: string;
  fotos: string[];
};

export type WebSyncResult = {
  success: boolean;
  status: WebSyncStatus;
  error?: string;
  syncedAt?: string;
};

type PropiedadForPayload = {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  precio: number | null;
  honorarios: number | null;
  web_precio_visible: boolean | null;
  tipo_operacion: string | null;
  estado: string | null;
  latitud: number | null;
  longitud: number | null;
  web_destacada: boolean | null;
  zona?: string;
  sector?: string;
  finca?: string;
  agente?: string;
};

// Prepara el payload limpio para envío a masteriberica.cat.
// NO realiza ninguna llamada de red — solo transforma los datos.
export function preparePropertyForWeb(property: PropiedadForPayload): WebPropertyPayload {
  const op = (property.tipo_operacion ?? "venta") as WebPropertyPayload["tipo_operacion"];
  const slug = [op, String(property.id)].join("-");

  return {
    id:             property.id,
    slug,
    titulo:         property.titulo ?? `Propiedad #${property.id}`,
    descripcion:    property.descripcion ?? "",
    precio:         property.precio ?? property.honorarios ?? null,
    precio_visible: property.web_precio_visible ?? true,
    tipo_operacion: op,
    estado:         property.estado ?? "noticia",
    zona:           property.zona   ?? "",
    sector:         property.sector ?? "",
    finca:          property.finca  ?? "",
    latitud:        property.latitud,
    longitud:       property.longitud,
    web_destacada:  property.web_destacada ?? false,
    agente:         property.agente ?? "",
    fotos:          [], // se añadirán cuando se implemente el sync real
  };
}

// Stub: en el futuro llamará a la API de masteriberica.cat
// Por ahora solo devuelve un resultado simulado.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncPropertyToWeb(_payload: WebPropertyPayload): Promise<WebSyncResult> {
  throw new Error("Sincronizacion con masteriberica.cat no implementada todavia.");
}
