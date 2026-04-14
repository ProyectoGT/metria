export type { Database, Tables, InsertTables, UpdateTables } from "./database.types";

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

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
