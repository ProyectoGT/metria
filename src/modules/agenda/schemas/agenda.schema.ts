import { z } from "zod";
import { ACTIVITY_PRIORITIES, ACTIVITY_TYPES } from "@/lib/activity-options";

const nullableText = z.string().trim().max(500, "Maximo 500 caracteres").nullable().optional();

export const agendaFormSchema = z
  .object({
    description: z.string().trim().min(1, "La descripcion es obligatoria").max(180, "Maximo 180 caracteres"),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no valida"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Hora no valida"),
    timeEnd: z.string().regex(/^\d{2}:\d{2}$/, "Hora no valida").nullable().optional(),
    priority: z.enum(ACTIVITY_PRIORITIES).default("media"),
    tipo: z.enum(ACTIVITY_TYPES).default("actividad"),
    completed: z.boolean().default(false),
    result: nullableText,
    assignedUserIds: z.array(z.coerce.number().int().positive()).min(1, "Selecciona al menos un usuario"),
    reminderMinutes: z.coerce.number().int().min(0).nullable().optional(),
    syncToGcal: z.boolean().optional(),
  })
  .refine((value) => !value.timeEnd || value.timeEnd > value.time, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["timeEnd"],
  });

export const agendaCreateSchema = agendaFormSchema.omit({ syncToGcal: true });

export const agendaUpdateSchema = agendaCreateSchema.partial().extend({
  id: z.coerce.number().int().positive("Actividad no valida"),
});

export type AgendaFormValues = z.infer<typeof agendaFormSchema>;
export type AgendaCreateValues = z.infer<typeof agendaCreateSchema>;
export type AgendaUpdateValues = z.infer<typeof agendaUpdateSchema>;
