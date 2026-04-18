import { z } from "zod";

export const CreateEventSchema = z.object({
  summary: z.string().min(1).max(500).trim(),
  description: z.string().max(2000).trim().optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido").optional(),
});

export const DeleteEventSchema = z.object({
  eventId: z.string().min(1).max(1024),
});
