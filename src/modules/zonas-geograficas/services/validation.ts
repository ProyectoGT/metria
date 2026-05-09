export type ValidationResult = { valid: boolean; error?: string };

function isArrayOfNumbers(arr: unknown): arr is number[] {
  return Array.isArray(arr) && arr.every((v) => typeof v === "number" && Number.isFinite(v));
}

function isValidLinearRing(ring: unknown): ring is number[][] {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  if (!ring.every((p) => Array.isArray(p) && p.length === 2 && isArrayOfNumbers(p))) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return false;
  return true;
}

export function validateGeoJsonPolygon(geojson: unknown): ValidationResult {
  if (!geojson || typeof geojson !== "object") {
    return { valid: false, error: "La geometria no es un objeto valido." };
  }

  const obj = geojson as Record<string, unknown>;

  if (obj.type !== "Polygon" && obj.type !== "MultiPolygon") {
    return { valid: false, error: "La geometria debe ser Polygon o MultiPolygon." };
  }

  if (obj.type === "Polygon") {
    const coords = obj.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) {
      return { valid: false, error: "El poligono no puede estar vacio." };
    }
    if (!isValidLinearRing(coords[0])) {
      return { valid: false, error: "El anillo exterior del poligono debe tener al menos 3 puntos y estar cerrado." };
    }
  }

  if (obj.type === "MultiPolygon") {
    const coords = obj.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) {
      return { valid: false, error: "El MultiPolygon no puede estar vacio." };
    }
    for (const polygon of coords) {
      if (!Array.isArray(polygon) || !isValidLinearRing(polygon[0])) {
        return { valid: false, error: "Cada poligono del MultiPolygon debe tener al menos 3 puntos y estar cerrado." };
      }
    }
  }

  return { valid: true };
}

export function validateCreateInput(input: {
  nombre: unknown;
  geojson: unknown;
  empresa_id: unknown;
}): ValidationResult {
  if (!input.nombre || typeof input.nombre !== "string" || input.nombre.trim().length === 0) {
    return { valid: false, error: "El nombre es obligatorio." };
  }

  if (!input.empresa_id || typeof input.empresa_id !== "number") {
    return { valid: false, error: "Falta empresa_id." };
  }

  return validateGeoJsonPolygon(input.geojson);
}
