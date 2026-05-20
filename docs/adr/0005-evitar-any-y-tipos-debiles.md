# ADR 0005: Evitar `as any` y tipos debiles

## Estado
Aceptado

## Contexto
Metria usa TypeScript y Supabase. Los joins, RPCs y tipos generados pueden ser incomodos, pero usar `as any` de forma habitual elimina proteccion justamente en las zonas con mas riesgo: datos, permisos, agenda, tareas y contactos.

## Decision
Evitaremos `as any` como escape por defecto. Cuando sea inevitable, debe estar acotado, comentado y preferiblemente encapsulado en un service o adapter tipado.

## Consecuencias positivas
- Menos errores silenciosos de schema.
- Refactors mas seguros.
- Contratos mas claros entre services, hooks y UI.
- Mejor autocompletado y onboarding.

## Trade-offs
- Algunos joins Supabase requieren tipos intermedios.
- Puede ser necesario crear DTOs o mappers.
- La migracion completa no debe bloquear trabajo urgente.

## Reglas practicas
- Preferir tipos generados de Supabase: `Tables<"tabla">`, `TablesInsert<"tabla">`, `TablesUpdate<"tabla">`.
- Encapsular casts complejos en services.
- Usar `unknown` + parser/mapper antes que `any`.
- Usar Zod para validar payloads de formularios y APIs.
- Si se usa `as any`, agregar comentario con motivo y plan de eliminacion.
- No propagar tipos debiles desde services hacia componentes.

## Ejemplos de uso correcto
```ts
type ContactoInsert = TablesInsert<"contactos">;

export async function createContacto(payload: ContactoInsert) {
  return supabase.from("contactos").insert(payload).select().single();
}
```

```ts
type AgendaWithUsersRow = Tables<"agenda"> & {
  agenda_usuarios: Array<{
    usuario_id: number;
    usuarios: { nombre: string | null; apellidos: string | null } | null;
  }>;
};
```

```ts
const result = AgendaFormSchema.safeParse(input);
if (!result.success) return { error: "Formulario invalido" };
```

## Antipatrones a evitar
- `createClient() as any` en componentes.
- Casts dobles `as unknown as X` sin mapper.
- Tipar payloads como `Record<string, any>`.
- Devolver datos sin transformar desde services con joins complejos.
- Silenciar errores de TypeScript en vez de corregir el contrato.
