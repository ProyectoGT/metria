import { z } from "zod";

export const CreateTicketSchema = z.object({
  tipo: z.string().min(1).max(100).trim(),
  asunto: z.string().min(1).max(200).trim(),
  descripcion: z.string().min(1).max(2000).trim(),
  prioridad: z.enum(["alta", "media", "baja"]).default("media"),
  nombre_usuario: z.string().max(200).trim().optional(),
  user_id: z.number().int().positive().nullable().optional(),
});
