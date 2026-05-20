// ─── API Schemas Compartidos ─────────────────────────────────────────────────
// Schemas Zod para validación de entrada en endpoints REST.
// Reutilizables desde server actions y route handlers.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// ─── Tareas ──────────────────────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  titulo: z.string().min(1, "El titulo es obligatorio").max(300),
  prioridad: z.enum(["alta", "media", "baja"]).default("media"),
  assignedUserIds: z.array(z.number().int().positive()).optional(),
});

export const UpdateTaskSchema = z.object({
  titulo: z.string().min(1).max(300).optional(),
  prioridad: z.enum(["alta", "media", "baja"]).optional(),
  estado: z.enum(["pendiente", "completado"]).optional(),
  resultado: z.string().max(2000).nullable().optional(),
  assignedUserIds: z.array(z.number().int().positive()).optional(),
});

export const CompleteTaskSchema = z.object({
  resultado: z.string().max(2000).nullable().optional(),
});

export const TaskListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["titulo", "created_at", "prioridad", "estado", "fecha"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  estado: z.enum(["pendiente", "completado", "todas"]).default("todas"),
  prioridad: z.enum(["alta", "media", "baja", "todas"]).default("todas"),
  q: z.string().max(100).optional(),
});

// ─── Propiedades (ejemplo) ───────────────────────────────────────────────────

export const PropertyListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["propietario", "created_at", "precio", "estado"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  estado: z.string().optional(),
  zonaId: z.coerce.number().int().positive().optional(),
  q: z.string().max(100).optional(),
});

// ─── Contactos (ejemplo) ─────────────────────────────────────────────────────

export const ContactListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["nombre", "created_at", "tipo", "empresa"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  tipo: z.string().optional(),
  q: z.string().max(100).optional(),
});

// ─── Usuarios (ejemplo) ──────────────────────────────────────────────────────

export const UserListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["nombre", "rol", "created_at"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  rol: z.string().optional(),
  q: z.string().max(100).optional(),
});

// ─── Pedidos / Solicitudes (ejemplo) ─────────────────────────────────────────

export const RequestListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["nombre_cliente", "created_at", "estado", "tipo_propiedad"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  estado: z.string().optional(),
  q: z.string().max(100).optional(),
});

// ─── Zonas (ejemplo) ─────────────────────────────────────────────────────────

export const ZoneListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["nombre", "created_at"]).default("nombre"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  q: z.string().max(100).optional(),
});
