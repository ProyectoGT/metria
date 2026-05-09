/**
 * Tests para el motor de matching propiedad-pedido.
 * Verifica que los scores y la lógica de filtrado son correctos
 * y no exponen propiedades de otras empresas.
 */
import { describe, it, expect } from "vitest";
import {
  calculatePropertyMatchScore,
  calculatePropertyMatches,
  type MatchPedido,
  type MatchPropiedad,
} from "@/modules/matching/services";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const pedidoBase: MatchPedido = {
  id: 1,
  nombre_cliente: "Ana García",
  tipo_propiedad: "Piso",
  zona_busqueda: "Centro",
  presupuesto: 200_000,
  modalidad: "CV",
  habitaciones: 3,
  banos: 2,
  garaje: true,
  altura_deseada: null,
  notas: null,
};

const propiedadCompatible: MatchPropiedad = {
  id: 10,
  planta: "3",
  puerta: "A",
  propietario: "Marcos López",
  estado: "noticia",
  notas: "Piso reformado en el centro de la ciudad",
  honorarios: 8000,
  finca_id: 1,
  fincas: {
    id: 1,
    numero: "12",
    sectores: {
      id: 1,
      numero: 2,
      zona_id: 5,
      zona: { id: 5, nombre: "Centro" },
    },
  },
};

const propiedadVendida: MatchPropiedad = {
  ...propiedadCompatible,
  id: 11,
  estado: "vendido",
};

const propiedadEncargo: MatchPropiedad = {
  ...propiedadCompatible,
  id: 12,
  estado: "encargo",
};

const propiedadSinZona: MatchPropiedad = {
  id: 13,
  planta: "1",
  puerta: "B",
  propietario: "Sin zona",
  estado: "noticia",
  notas: null,
  honorarios: null,
  finca_id: 2,
  fincas: null,
};

// ─── calculatePropertyMatchScore ─────────────────────────────────────────────

describe("calculatePropertyMatchScore", () => {
  it("propiedad vendida siempre devuelve score 0", () => {
    const result = calculatePropertyMatchScore(pedidoBase, propiedadVendida);
    expect(result.score).toBe(0);
  });

  it("propiedad disponible obtiene score > 0", () => {
    const result = calculatePropertyMatchScore(pedidoBase, propiedadCompatible);
    expect(result.score).toBeGreaterThan(0);
  });

  it("coincidencia de zona suma puntos", () => {
    const conZona = calculatePropertyMatchScore(pedidoBase, propiedadCompatible);
    const sinZona = calculatePropertyMatchScore(pedidoBase, propiedadSinZona);
    // La propiedad con zona "Centro" que coincide debe tener mayor score
    expect(conZona.score).toBeGreaterThan(sinZona.score);
  });

  it("encargo también puntúa (estado disponible)", () => {
    const result = calculatePropertyMatchScore(pedidoBase, propiedadEncargo);
    expect(result.score).toBeGreaterThan(0);
  });

  it("devuelve razones no vacías para matches válidos", () => {
    const result = calculatePropertyMatchScore(pedidoBase, propiedadCompatible);
    expect(result.razones.length).toBeGreaterThan(0);
  });

  it("score está siempre entre 0 y 100", () => {
    const result = calculatePropertyMatchScore(pedidoBase, propiedadCompatible);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ─── calculatePropertyMatches ─────────────────────────────────────────────────

describe("calculatePropertyMatches", () => {
  const propiedades = [propiedadCompatible, propiedadVendida, propiedadEncargo, propiedadSinZona];

  it("excluye propiedades vendidas de los resultados", () => {
    const matches = calculatePropertyMatches(pedidoBase, propiedades, { minScore: 0 });
    const ids = matches.map((m) => m.propiedad.id);
    expect(ids).not.toContain(propiedadVendida.id);
  });

  it("aplica el umbral minScore correctamente", () => {
    const matchesAlto = calculatePropertyMatches(pedidoBase, propiedades, { minScore: 90 });
    const matchesBajo = calculatePropertyMatches(pedidoBase, propiedades, { minScore: 0 });
    expect(matchesAlto.length).toBeLessThanOrEqual(matchesBajo.length);
  });

  it("respeta el límite de resultados", () => {
    const matches = calculatePropertyMatches(pedidoBase, propiedades, { limit: 1 });
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("ordena resultados de mayor a menor score", () => {
    const matches = calculatePropertyMatches(pedidoBase, propiedades, { minScore: 0 });
    for (let i = 0; i < matches.length - 1; i++) {
      expect(matches[i].score).toBeGreaterThanOrEqual(matches[i + 1].score);
    }
  });

  it("devuelve array vacío si no hay propiedades disponibles", () => {
    const matches = calculatePropertyMatches(pedidoBase, [propiedadVendida], { minScore: 0 });
    expect(matches).toHaveLength(0);
  });

  it("devuelve array vacío para lista de entrada vacía", () => {
    const matches = calculatePropertyMatches(pedidoBase, []);
    expect(matches).toHaveLength(0);
  });
});

// ─── Seguridad: matching no expone datos de otras empresas ────────────────────
// El matching opera sobre propiedades ya filtradas por RLS. Estos tests verifican
// que la función en sí no añade propiedades fuera del conjunto dado (no hay bypass).

describe("Matching no expone datos fuera del conjunto dado", () => {
  it("solo devuelve propiedades del array de entrada", () => {
    const propInput = [propiedadCompatible];
    const matches = calculatePropertyMatches(pedidoBase, propInput);
    for (const m of matches) {
      expect(propInput.map((p) => p.id)).toContain(m.propiedad.id);
    }
  });

  it("conjunto vacío devuelve matches vacíos, nunca datos externos", () => {
    const matches = calculatePropertyMatches(pedidoBase, []);
    expect(matches).toHaveLength(0);
  });
});
