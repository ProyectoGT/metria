import { z } from "zod";

export const CreateEventSchema = z.object({
  summary: z.string().min(1).max(500).trim(),
  description: z.string().max(2000).trim().optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha invalido"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora invalido").optional(),
  timeEnd: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora fin invalido").optional(),
  agendaId: z.number().int().positive().optional(),
  reminderMinutes: z.number().int().min(0).max(10080).optional(), // max 1 semana
});

export const UpdateEventSchema = CreateEventSchema.extend({
  eventId: z.string().min(1).max(1024),
});

export const DeleteEventSchema = z.object({
  eventId: z.string().min(1).max(1024),
});
