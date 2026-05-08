export type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";
// Alias de compatibilidad para código existente
export type { TablesInsert as InsertTables, TablesUpdate as UpdateTables } from "./database.types";

// Alias de las tablas para uso directo
export type Zona = import("./database.types").Tables<"zona">;
export type Sector = import("./database.types").Tables<"sectores">;
export type Finca = import("./database.types").Tables<"fincas">;
export type Propiedad = import("./database.types").Tables<"propiedades">;
export type Archivo = import("./database.types").Tables<"archivos">;
export type Usuario = import("./database.types").Tables<"usuarios">;
export type Pedido = import("./database.types").Tables<"pedidos">;
export type Tarea = import("./database.types").Tables<"tareas">;
export type Agenda = import("./database.types").Tables<"agenda">;

// ─── Zonas Geográficas (dibujadas en mapa) ────────────────────────────────────

export type ZonaGeograficaEstado = "activa" | "archivada";

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type ZonaGeografica = {
  id: number;
  empresa_id: number;
  nombre: string;
  descripcion: string | null;
  color: string;
  tipo: string;
  estado: ZonaGeograficaEstado;
  geojson: GeoJsonPolygon | GeoJsonMultiPolygon;
  area_sqm: number | null;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
export type SoporteTicket = import("./database.types").Tables<"tickets_soporte">;
export type SoporteMensaje = import("./database.types").Tables<"soporte_mensajes">;
export type SoporteNotificacion = import("./database.types").Tables<"soporte_notificaciones">;

// ─── Contactos ────────────────────────────────────────────────────────────────

export type ContactoTipo =
  | "cliente" | "propietario" | "comprador" | "inquilino"
  | "colaborador" | "proveedor" | "abogado" | "notario"
  | "banco" | "administrador_fincas" | "reformista" | "arquitecto" | "otro";

export type ContactoEstado = "activo" | "inactivo";

export type Contacto = {
  id: number;
  nombre: string;
  apellidos: string | null;
  empresa: string | null;
  cargo: string | null;
  tipo: ContactoTipo;
  email: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  pais: string;
  notas: string | null;
  origen: string | null;
  estado: ContactoEstado;
  owner_user_id: number | null;
  empresa_id: number | null;
  equipo_id: number | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ContactoInsert = Omit<Contacto, "id" | "created_at" | "updated_at" | "archived_at" | "owner_user_id" | "empresa_id" | "equipo_id">;
export type ContactoUpdate = Partial<ContactoInsert>;

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
