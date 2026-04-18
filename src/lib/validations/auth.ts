import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Correo no válido").max(254),
  password: z.string().min(1, "La contraseña es obligatoria").max(256),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email("Correo no válido").max(254),
});
