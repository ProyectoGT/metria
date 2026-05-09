import type { ZonaGeografica, GeoJsonPolygon, GeoJsonMultiPolygon } from "@/types";

export type { ZonaGeografica, GeoJsonPolygon, GeoJsonMultiPolygon };

export type ZonaGeoCreateInput = {
  nombre: string;
  descripcion?: string;
  color: string;
  tipo?: string;
  geojson: GeoJsonPolygon | GeoJsonMultiPolygon;
};

export type ZonaGeoUpdateInput = {
  nombre?: string;
  descripcion?: string;
  color?: string;
  tipo?: string;
};

export type ZonaGeoFormData = {
  nombre: string;
  descripcion: string;
  color: string;
  tipo: string;
};

export const DEFAULT_ZONA_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#db2777",
  "#ea580c",
];

export const ZONA_TIPOS = [
  "personalizada",
  "comercial",
  "seguimiento",
  "exclusiva",
  "otro",
] as const;
