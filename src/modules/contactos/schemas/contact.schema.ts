import { z } from "zod";

export const contactTypeSchema = z.enum([
  "cliente",
  "propietario",
  "comprador",
  "inquilino",
  "colaborador",
  "proveedor",
  "abogado",
  "notario",
  "banco",
  "administrador_fincas",
  "reformista",
  "arquitecto",
  "otro",
]);

export const contactStatusSchema = z.enum(["activo", "inactivo"]);

const optionalText = z.string().trim().max(255, "Maximo 255 caracteres").optional().or(z.literal(""));
const optionalLongText = z.string().trim().max(1500, "Maximo 1500 caracteres").optional().or(z.literal(""));

export const contactFormSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120, "Maximo 120 caracteres"),
  apellidos: optionalText,
  empresa: optionalText,
  cargo: optionalText,
  tipo: contactTypeSchema.default("otro"),
  email: z.string().trim().email("Email no valido").optional().or(z.literal("")),
  telefono: optionalText,
  telefono_secundario: optionalText,
  direccion: optionalText,
  ciudad: optionalText,
  provincia: optionalText,
  codigo_postal: optionalText,
  pais: z.string().trim().max(80, "Maximo 80 caracteres").default("Espana"),
  notas: optionalLongText,
  origen: optionalText,
  estado: contactStatusSchema.default("activo"),
  visibility: z.string().trim().min(1).default("company"),
});

export const contactCreateSchema = contactFormSchema;

export const contactUpdateSchema = contactFormSchema.partial().extend({
  id: z.coerce.number().int().positive("Contacto no valido"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type ContactCreateValues = z.infer<typeof contactCreateSchema>;
export type ContactUpdateValues = z.infer<typeof contactUpdateSchema>;
