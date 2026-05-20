export type MetricKey = "facturado" | "encargos" | "ventas" | "contactos";
export type ObjectiveKey =
  | "objetivo_facturado"
  | "objetivo_encargos"
  | "objetivo_ventas"
  | "objetivo_contactos";

export type RendimientoPeriodo = {
  id?: number;
  agente_id: number;
  anio: number;
  mes: number;
  facturado: number;
  objetivo_facturado: number;
  encargos: number;
  objetivo_encargos: number;
  ventas: number;
  objetivo_ventas: number;
  contactos: number;
  objetivo_contactos: number;
};

export type RendimientoRow = Partial<RendimientoPeriodo> & {
  agente_id: number;
  anio: number;
  mes: number;
};

export type DesarrolloActivityRow = {
  agente_id: number | null;
  metric: string | null;
  value: number | null;
};

export type AgentMetricRef = {
  id: number;
};

export const METRIC_KEYS: MetricKey[] = [
  "facturado",
  "encargos",
  "ventas",
  "contactos",
];

// Defaults mensuales
export const DEFAULT_OBJECTIVES = {
  objetivo_facturado: 10000,
  objetivo_encargos: 10,
  objetivo_ventas: 5,
  objetivo_contactos: 600,
};

export function defaultRendimiento(
  agenteId: number,
  anio: number,
  mes: number,
): RendimientoPeriodo {
  return {
    agente_id: agenteId,
    anio,
    mes,
    facturado: 0,
    objetivo_facturado: DEFAULT_OBJECTIVES.objetivo_facturado,
    encargos: 0,
    objetivo_encargos: DEFAULT_OBJECTIVES.objetivo_encargos,
    ventas: 0,
    objetivo_ventas: DEFAULT_OBJECTIVES.objetivo_ventas,
    contactos: 0,
    objetivo_contactos: DEFAULT_OBJECTIVES.objetivo_contactos,
  };
}

export function getPeriodRange(anio: number, mes: number) {
  const startMonth = mes === 0 ? 0 : mes - 1;
  const endYear = mes === 0 ? anio + 1 : startMonth === 11 ? anio + 1 : anio;
  const endMonth = mes === 0 ? 0 : (startMonth + 1) % 12;

  return {
    from: new Date(Date.UTC(anio, startMonth, 1)).toISOString(),
    to: new Date(Date.UTC(endYear, endMonth, 1)).toISOString(),
  };
}

function isMetricKey(value: string | null): value is MetricKey {
  return METRIC_KEYS.includes(value as MetricKey);
}

/**
 * Para la vista anual (mes=0): suma los 12 registros mensuales por agente.
 * Los objetivos anuales = suma de los objetivos de los 12 meses.
 * Si un mes no tiene registro, se usa el default mensual.
 */
export function mergeRendimientoRowsAnual({
  agentes,
  objetivos,
  actividades,
  anio,
}: {
  agentes: AgentMetricRef[];
  objetivos: RendimientoRow[];        // todos los meses del año (mes 1-12)
  actividades: DesarrolloActivityRow[];
  anio: number;
}): Record<number, RendimientoPeriodo> {
  const result: Record<number, RendimientoPeriodo> = {};

  for (const agente of agentes) {
    // Sumar objetivos de los 12 meses
    let obj_facturado = 0;
    let obj_encargos = 0;
    let obj_ventas = 0;
    let obj_contactos = 0;

    for (let m = 1; m <= 12; m++) {
      const row = objetivos.find((o) => o.agente_id === agente.id && o.mes === m);
      obj_facturado += Number(row?.objetivo_facturado ?? DEFAULT_OBJECTIVES.objetivo_facturado);
      obj_encargos  += Number(row?.objetivo_encargos  ?? DEFAULT_OBJECTIVES.objetivo_encargos);
      obj_ventas    += Number(row?.objetivo_ventas    ?? DEFAULT_OBJECTIVES.objetivo_ventas);
      obj_contactos += Number(row?.objetivo_contactos ?? DEFAULT_OBJECTIVES.objetivo_contactos);
    }

    result[agente.id] = {
      agente_id: agente.id,
      anio,
      mes: 0,
      facturado: 0,
      encargos: 0,
      ventas: 0,
      contactos: 0,
      objetivo_facturado: obj_facturado,
      objetivo_encargos: obj_encargos,
      objetivo_ventas: obj_ventas,
      objetivo_contactos: obj_contactos,
    };
  }

  // Sumar actividades reales del año completo
  for (const activity of actividades) {
    if (!activity.agente_id || !result[activity.agente_id]) continue;
    if (!isMetricKey(activity.metric)) continue;
    result[activity.agente_id][activity.metric] += Number(activity.value ?? 0);
  }

  return result;
}

export function mergeRendimientoRows({
  agentes,
  objetivos,
  actividades,
  anio,
  mes,
}: {
  agentes: AgentMetricRef[];
  objetivos: RendimientoRow[];
  actividades: DesarrolloActivityRow[];
  anio: number;
  mes: number;
}) {
  const result: Record<number, RendimientoPeriodo> = Object.fromEntries(
    agentes.map((agente) => [
      agente.id,
      defaultRendimiento(agente.id, anio, mes),
    ]),
  );

  for (const row of objetivos) {
    if (!result[row.agente_id]) continue;

    result[row.agente_id] = {
      ...result[row.agente_id],
      ...row,
      agente_id: row.agente_id,
      anio: row.anio,
      mes: row.mes,
      facturado: Number(row.facturado ?? 0),
      encargos: Number(row.encargos ?? 0),
      ventas: Number(row.ventas ?? 0),
      contactos: Number(row.contactos ?? 0),
      objetivo_facturado: Number(
        row.objetivo_facturado ?? DEFAULT_OBJECTIVES.objetivo_facturado,
      ),
      objetivo_encargos: Number(
        row.objetivo_encargos ?? DEFAULT_OBJECTIVES.objetivo_encargos,
      ),
      objetivo_ventas: Number(
        row.objetivo_ventas ?? DEFAULT_OBJECTIVES.objetivo_ventas,
      ),
      objetivo_contactos: Number(
        row.objetivo_contactos ?? DEFAULT_OBJECTIVES.objetivo_contactos,
      ),
    };
  }

  for (const activity of actividades) {
    if (!activity.agente_id || !result[activity.agente_id]) continue;
    if (!isMetricKey(activity.metric)) continue;

    result[activity.agente_id][activity.metric] += Number(activity.value ?? 0);
  }

  return result;
}
