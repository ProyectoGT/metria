import { z } from "zod";

export const CreateUserSchema = z.object({
  nombre: z.string().min(1).max(100).trim(),
  apellidos: z.string().min(1).max(100).trim(),
  correo: z.string().email("Correo no válido").max(254).toLowerCase(),
  rol: z.enum(["Administrador", "Director", "Responsable", "Agente"]),
  password: z.string().min(8).max(256),
  confirmPassword: z.string().min(1).max(256),
  sendInvite: z.boolean().optional(),
  supervisorId: z.number().int().positive().nullable().optional(),
});
