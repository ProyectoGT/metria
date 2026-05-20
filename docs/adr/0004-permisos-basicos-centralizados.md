# ADR 0004: Permisos basicos centralizados

## Estado
Aceptado

## Contexto
Metria tiene roles como Administrador, Director, Responsable y Agente. Tambien hay permisos configurables por empresa. La logica de permisos no debe repartirse entre componentes, server actions y RLS sin un contrato comun.

## Decision
Centralizaremos los permisos basicos en una API de dominio: `can(user, action, module, entity?)`. La UI puede usar permisos para mostrar u ocultar acciones, pero la seguridad real debe validarse en server actions, RPCs y RLS.

## Consecuencias positivas
- Reduce duplicacion de checks por rol.
- Hace mas facil auditar permisos.
- Permite separar permisos base de permisos configurables por empresa.
- Evita que la UI sea la unica barrera de seguridad.

## Trade-offs
- Durante la migracion conviviran helpers antiguos y nuevos.
- Algunos recursos no encajan al principio en `module:action`.
- Hay que mantener el mapping de roles con cuidado.

## Reglas practicas
- Usar `can` para checks de dominio.
- Usar guards server para acciones criticas.
- La UI puede deshabilitar u ocultar, pero no sustituye validacion server.
- Las reglas por empresa deben complementar, no duplicar, permisos base.
- No hardcodear roles en componentes salvo casos transitorios justificados.

## Ejemplos de uso correcto
```ts
if (!canFromContext(currentUser, "delete", "tareas", { ownerId })) {
  throw new AuthorizationError("No autorizado", "delete", "tareas");
}
```

```tsx
{can(user, "create", "contactos") && <CreateContactButton />}
```

## Antipatrones a evitar
- `role === "Administrador"` repetido en componentes.
- Confiar solo en ocultar botones.
- Crear un segundo mapa de permisos para cada pantalla.
- Cambiar permisos de negocio sin validar roles afectados.
- Mezclar nombres de roles canonicos e historicos sin normalizacion.
