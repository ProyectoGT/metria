import { z } from "zod";

export const SearchSchema = z.object({
  q: z.string().min(2).max(100).trim(),
  ctx: z.enum(["general", "zona", "solicitudes", "usuarios", "soporte"]).default("general"),
});
