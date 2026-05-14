// ─── Tipos de plantilla ────────────────────────────────────────────────────────

export type DocumentType =
  | "ficha_propiedad"
  | "resumen_pedido"
  | "encargo_venta"
  | "encargo_alquiler";

export const DOCUMENT_TYPES: { value: DocumentType; label: string; description: string }[] = [
  {
    value: "ficha_propiedad",
    label: "Ficha de propiedad",
    description: "Datos completos de la propiedad: propietario, ubicacion, estado, agente.",
  },
  {
    value: "resumen_pedido",
    label: "Resumen de pedido / cliente",
    description: "Perfil del cliente con sus requisitos de busqueda y presupuesto.",
  },
  {
    value: "encargo_venta",
    label: "Encargo de venta",
    description: "Documento de encargo de mediacion para venta de la propiedad.",
  },
  {
    value: "encargo_alquiler",
    label: "Encargo de alquiler",
    description: "Documento de encargo de mediacion para alquiler de la propiedad.",
  },
];

// ─── Datos de entrada para cada plantilla ─────────────────────────────────────

export type PropiedadDocData = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  estado: string | null;
  fecha_visita: string | null;
  honorarios: number | null;
  notas: string | null;
  // Ubicación jerárquica
  finca: string | null;
  sector: string | null;
  zona: string | null;
  // Agente
  agente_nombre: string | null;
  agente_correo: string | null;
};

export type PedidoDocData = {
  id: number;
  nombre_cliente: string;
  telefono: string | null;
  tipo_propiedad: string | null;
  zona_nombre: string | null;
  presupuesto: number | null;
  modalidad: string | null;
  habitaciones: number | null;
  banos: number | null;
  garaje: boolean | null;
  altura_deseada: string | null;
  caracteristicas: string | null;
  notas: string | null;
  origen: string | null;
  // Agente
  agente_nombre: string | null;
  agente_correo: string | null;
};

// ─── CSS compartido para todos los documentos ─────────────────────────────────

export function sharedStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1a1a2e;
      background: #fff;
      padding: 32px;
      max-width: 820px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1a56db;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-brand { font-size: 20px; font-weight: 700; color: #1a56db; }
    .header-meta { text-align: right; font-size: 11px; color: #6b7280; }
    .doc-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .doc-subtitle {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
    }
    .field label {
      display: block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #9ca3af;
      margin-bottom: 2px;
    }
    .field span {
      display: block;
      font-size: 13px;
      color: #111827;
      font-weight: 500;
    }
    .field span.empty {
      color: #d1d5db;
      font-style: italic;
      font-weight: 400;
    }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .notes-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      color: #374151;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .signature-block {
      margin-top: 48px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
    .signature-line {
      border-top: 1px solid #111827;
      padding-top: 8px;
      font-size: 11px;
      color: #6b7280;
    }
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { padding: 16px; }
      @page { margin: 1.5cm; }
    }
  `;
}

function field(label: string, value: string | null | undefined, empty = "—"): string {
  const display = value?.trim() || empty;
  const cls = display === empty ? " class=\"empty\"" : "";
  return `<div class="field"><label>${label}</label><span${cls}>${display}</span></div>`;
}

function badge(text: string, type: "blue" | "green" | "amber" | "gray" = "gray"): string {
  return `<span class="badge badge-${type}">${text}</span>`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function formatEur(n: number | null): string {
  if (!n) return "—";
  return n.toLocaleString("es-ES") + " €";
}

function formatModalidad(m: string | null): string {
  if (!m) return "—";
  const map: Record<string, string> = { CV: "Compraventa", CH: "Compra con hipoteca", ALQ: "Alquiler", CONTADO: "Pago al contado" };
  return map[m] ?? m;
}

function estadoBadge(estado: string | null): string {
  if (!estado) return badge("—");
  const map: Record<string, "blue" | "green" | "amber" | "gray"> = {
    noticia: "blue",
    encargo: "green",
    vendido: "green",
    seguimiento: "amber",
  };
  return badge(estado.charAt(0).toUpperCase() + estado.slice(1), map[estado] ?? "gray");
}

function htmlDoc(title: string, body: string): string {
  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Master Iberica</title>
  <style>${sharedStyles()}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-brand">MASTER IBERICA</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">Plataforma Inmobiliaria</div>
    </div>
    <div class="header-meta">
      <div>Generado el ${today}</div>
      <div style="margin-top:4px;">Documento interno — uso exclusivo</div>
    </div>
  </div>
  ${body}
  <div class="footer">
    Este documento ha sido generado automaticamente por Metria CRM · Master Iberica
  </div>
  <script>window.addEventListener('load', () => window.print());</script>
</body>
</html>`;
}

// ─── Ficha de propiedad ────────────────────────────────────────────────────────

export function generateFichaPropiedad(p: PropiedadDocData): string {
  const titulo = p.propietario?.trim()
    || [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`].filter(Boolean).join(" ")
    || `Propiedad #${p.id}`;

  const body = `
    <div class="doc-title">Ficha de Propiedad</div>
    <div class="doc-subtitle">Referencia interna #${p.id} · ${titulo}</div>

    <div class="section">
      <div class="section-title">Identificacion</div>
      <div class="grid-2">
        ${field("Propietario", p.propietario)}
        ${field("Telefono", p.telefono)}
        ${field("Planta", p.planta)}
        ${field("Puerta", p.puerta)}
        <div class="field"><label>Estado</label>${estadoBadge(p.estado)}</div>
        ${field("Fecha de visita", formatDate(p.fecha_visita))}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Ubicacion</div>
      <div class="grid-2">
        ${field("Zona", p.zona)}
        ${field("Sector", p.sector)}
        ${field("Finca", p.finca)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Condiciones economicas</div>
      <div class="grid-2">
        ${field("Honorarios / Comision", formatEur(p.honorarios))}
      </div>
    </div>

    ${p.notas ? `
    <div class="section">
      <div class="section-title">Notas</div>
      <div class="notes-box">${p.notas}</div>
    </div>` : ""}

    <div class="section">
      <div class="section-title">Agente responsable</div>
      <div class="grid-2">
        ${field("Nombre", p.agente_nombre)}
        ${field("Correo", p.agente_correo)}
      </div>
    </div>`;

  return htmlDoc(`Ficha de Propiedad #${p.id}`, body);
}

// ─── Resumen de pedido / cliente ───────────────────────────────────────────────

export function generateResumenPedido(p: PedidoDocData): string {
  const garaje = p.garaje === true ? "Si" : p.garaje === false ? "No" : "—";

  const body = `
    <div class="doc-title">Resumen de Pedido — Cliente</div>
    <div class="doc-subtitle">Referencia #${p.id} · ${p.nombre_cliente}</div>

    <div class="section">
      <div class="section-title">Datos del cliente</div>
      <div class="grid-2">
        ${field("Nombre", p.nombre_cliente)}
        ${field("Telefono", p.telefono)}
        ${field("Origen", p.origen)}
        <div class="field"><label>Modalidad</label>${badge(formatModalidad(p.modalidad), p.modalidad === "ALQ" ? "blue" : "green")}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Requisitos de busqueda</div>
      <div class="grid-2">
        ${field("Zona deseada", p.zona_nombre)}
        ${field("Tipo de propiedad", p.tipo_propiedad)}
        ${field("Presupuesto maximo", formatEur(p.presupuesto))}
        ${field("Habitaciones", p.habitaciones != null ? String(p.habitaciones) : null)}
        ${field("Banos", p.banos != null ? String(p.banos) : null)}
        ${field("Garaje", garaje)}
        ${field("Altura preferida", p.altura_deseada)}
      </div>
    </div>

    ${p.caracteristicas ? `
    <div class="section">
      <div class="section-title">Caracteristicas adicionales</div>
      <div class="notes-box">${p.caracteristicas}</div>
    </div>` : ""}

    ${p.notas ? `
    <div class="section">
      <div class="section-title">Notas internas</div>
      <div class="notes-box">${p.notas}</div>
    </div>` : ""}

    <div class="section">
      <div class="section-title">Agente responsable</div>
      <div class="grid-2">
        ${field("Nombre", p.agente_nombre)}
        ${field("Correo", p.agente_correo)}
      </div>
    </div>`;

  return htmlDoc(`Resumen Pedido #${p.id}`, body);
}

// ─── Encargo de venta / alquiler ───────────────────────────────────────────────

export function generateEncargo(p: PropiedadDocData, modalidad: "venta" | "alquiler"): string {
  const titulo = p.propietario?.trim()
    || [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`].filter(Boolean).join(" ")
    || `Propiedad #${p.id}`;
  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const tipoEncargo = modalidad === "venta" ? "Venta" : "Alquiler";

  const body = `
    <div class="doc-title">Encargo de Mediacion — ${tipoEncargo}</div>
    <div class="doc-subtitle">Ref. #${p.id} · ${titulo}</div>

    <div class="section">
      <div class="section-title">Datos del encargo</div>
      <div class="grid-2">
        ${field("Fecha del encargo", today)}
        ${field("Tipo de operacion", tipoEncargo)}
        ${field("Referencia", `#${p.id}`)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Datos del propietario / cedente</div>
      <div class="grid-2">
        ${field("Nombre / Razon social", p.propietario)}
        ${field("Telefono de contacto", p.telefono)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Inmueble objeto del encargo</div>
      <div class="grid-2">
        ${field("Zona", p.zona)}
        ${field("Sector / Barrio", p.sector)}
        ${field("Finca / Edificio", p.finca)}
        ${field("Planta", p.planta)}
        ${field("Puerta", p.puerta)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Condiciones de la mediacion</div>
      <div class="grid-2">
        ${field("Honorarios acordados", p.honorarios ? formatEur(p.honorarios) : null)}
        ${field("Agente designado", p.agente_nombre)}
      </div>
    </div>

    ${p.notas ? `
    <div class="section">
      <div class="section-title">Observaciones</div>
      <div class="notes-box">${p.notas}</div>
    </div>` : ""}

    <div class="section" style="margin-top:32px;">
      <div class="section-title">Clausulas basicas</div>
      <div style="font-size:12px;color:#374151;line-height:1.7;">
        <p style="margin-bottom:8px;">
          El propietario autoriza a MASTER IBERICA para que, en su nombre y representacion, gestione la ${tipoEncargo.toLowerCase()}
          del inmueble descrito en el presente documento, comprometiendose a no otorgar otro encargo de la misma naturaleza
          durante la vigencia de este contrato.
        </p>
        <p style="margin-bottom:8px;">
          Los honorarios de mediacion seran abonados en el momento de la firma del contrato
          ${modalidad === "venta" ? "de compraventa o arras" : "de arrendamiento"},
          corriendo a cargo de ${modalidad === "venta" ? "las partes segun acuerdo" : "el propietario"}.
        </p>
        <p>
          Vigencia del encargo: 6 meses desde la fecha de firma, prorrogable por acuerdo entre las partes.
        </p>
      </div>
    </div>

    <div class="signature-block">
      <div>
        <div class="signature-line">
          Firma del propietario / cedente<br />
          D./D.ª ___________________________________
        </div>
      </div>
      <div>
        <div class="signature-line">
          Firma del agente — MASTER IBERICA<br />
          ${p.agente_nombre ?? "___________________________________"}
        </div>
      </div>
    </div>`;

  return htmlDoc(`Encargo de ${tipoEncargo} #${p.id}`, body);
}
