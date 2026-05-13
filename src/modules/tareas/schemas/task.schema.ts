import { z } from "zod";

export const taskPrioritySchema = z.enum(["alta", "media", "baja"]);

const assignedUserIdsSchema = z
  .array(z.number().int().positive("Usuario asignado no valido"))
  .min(1, "Selecciona al menos un usuario");

export const taskCardFormSchema = z.object({
  title: z.string().trim().min(1, "El titulo es obligatorio").max(160, "Maximo 160 caracteres"),
  description: z.string().trim().max(500, "Maximo 500 caracteres").optional().or(z.literal("")),
  priority: taskPrioritySchema,
  assignedUserIds: assignedUserIdsSchema,
});

export const taskCreateSchema = z.object({
  titulo: z.string().trim().min(1, "El titulo es obligatorio").max(160, "Maximo 160 caracteres"),
  prioridad: taskPrioritySchema.optional(),
  resultado: z.string().trim().max(500, "Maximo 500 caracteres").nullable().optional(),
  completed: z.boolean().optional(),
  assignedUserIds: assignedUserIdsSchema.optional(),
  visibility: z.string().trim().min(1).optional(),
});

export const taskUpdateSchema = taskCreateSchema.extend({
  id: z.coerce.number().int().positive("Tarea no valida"),
});

export type TaskCardFormValues = z.infer<typeof taskCardFormSchema>;
export type TaskCreateValues = z.infer<typeof taskCreateSchema>;
export type TaskUpdateValues = z.infer<typeof taskUpdateSchema>;
