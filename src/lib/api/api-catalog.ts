// ─── API Catalog ─────────────────────────────────────────────────────────────
// Catálogo de todos los endpoints REST estandarizados de Metria.
// Sirve como documentación viva y referencia para desarrollo.
//
// Convenciones:
//   - Formato respuesta éxito: { data: T, meta?: PaginationMeta }
//   - Formato respuesta error: { error: { code, message, details? } }
//   - Paginación: query params ?page=1&pageSize=20
//   - Ordenación: query params ?sortBy=nombre&sortOrder=asc
//   - Filtros:    query params específicos por entidad
//   - Búsqueda:   query param ?q=termino
//   - Autenticación: todas las rutas requieren sesión (via supabase)
//   - Validación: Zod schemas en src/lib/api/schemas.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ─── Tareas (tasks) ─────────────────────────────────────────────────────────
 *
 * GET    /api/tasks                     → Listar tareas (paginado)
 * POST   /api/tasks                     → Crear tarea
 * GET    /api/tasks/:id                 → Obtener tarea
 * PATCH  /api/tasks/:id                 → Actualizar tarea
 * DELETE /api/tasks/:id                 → Archivar tarea
 * PATCH  /api/tasks/:id/complete        → Completar tarea
 * PATCH  /api/tasks/:id/status          → Cambiar estado (pendiente)
 *
 * Schemas: CreateTaskSchema, UpdateTaskSchema, CompleteTaskSchema, TaskListSchema
 * Estado:  ✅ Implementado
 */

/**
 * ─── Propiedades (properties) ────────────────────────────────────────────────
 *
 * GET    /api/properties                → Listar propiedades (paginado)
 * POST   /api/properties                → Crear propiedad
 * GET    /api/properties/:id            → Obtener propiedad
 * PATCH  /api/properties/:id            → Actualizar propiedad
 * DELETE /api/properties/:id            → Eliminar propiedad
 * PATCH  /api/properties/:id/status     → Cambiar estado
 *
 * Schemas: PropertyListSchema (+ CreatePropertySchema, UpdatePropertySchema)
 * Estado:  🏗️ Pendiente
 */

/**
 * ─── Contactos (contacts) ────────────────────────────────────────────────────
 *
 * GET    /api/contacts                  → Listar contactos (paginado)
 * POST   /api/contacts                  → Crear contacto
 * GET    /api/contacts/:id              → Obtener contacto
 * PATCH  /api/contacts/:id              → Actualizar contacto
 * DELETE /api/contacts/:id              → Eliminar contacto
 *
 * Schemas: ContactListSchema (+ CreateContactSchema, UpdateContactSchema)
 * Estado:  🏗️ Pendiente
 */

/**
 * ─── Usuarios (users) ────────────────────────────────────────────────────────
 *
 * GET    /api/users                     → Listar usuarios (paginado)
 * POST   /api/users                     → Crear usuario (admin)
 * GET    /api/users/:id                 → Obtener usuario
 * PATCH  /api/users/:id                 → Actualizar usuario
 * DELETE /api/users/:id                 → Eliminar/deshabilitar usuario
 *
 * Schemas: UserListSchema (+ CreateUserSchema, UpdateUserSchema)
 * Estado:  🏗️ Pendiente
 */

/**
 * ─── Eventos de calendario (calendar-events) ────────────────────────────────
 *
 * GET    /api/calendar-events           → Listar eventos (rango fechas)
 * POST   /api/calendar-events           → Crear evento
 * GET    /api/calendar-events/:id       → Obtener evento
 * PATCH  /api/calendar-events/:id       → Actualizar evento
 * DELETE /api/calendar-events/:id       → Eliminar evento
 * PATCH  /api/calendar-events/:id/complete → Completar evento
 *
 * Estado: 🏗️ Pendiente (actualmente manejado por /api/google/events)
 */

/**
 * ─── Órdenes del día (orders) ────────────────────────────────────────────────
 *
 * GET    /api/orders                    → Listar órdenes del día
 * POST   /api/orders                    → Crear orden
 * PATCH  /api/orders/:id/complete       → Completar orden
 *
 * Estado: 🏗️ Pendiente (actualmente manejado por server actions)
 */

/**
 * ─── Zonas (zones) ───────────────────────────────────────────────────────────
 *
 * GET    /api/zones                     → Listar zonas (paginado)
 * POST   /api/zones                     → Crear zona
 * GET    /api/zones/:id                 → Obtener zona (con sectores)
 * PATCH  /api/zones/:id                 → Actualizar zona
 * DELETE /api/zones/:id                 → Eliminar zona
 *
 * Schemas: ZoneListSchema
 * Estado:  🏗️ Pendiente
 */

/**
 * ─── Solicitudes / Pedidos (requests) ────────────────────────────────────────
 *
 * GET    /api/requests                  → Listar solicitudes (paginado)
 * POST   /api/requests                  → Crear solicitud
 * GET    /api/requests/:id              → Obtener solicitud
 * PATCH  /api/requests/:id              → Actualizar solicitud
 * DELETE /api/requests/:id              → Eliminar solicitud
 *
 * Schemas: RequestListSchema
 * Estado:  🏗️ Pendiente
 */

/**
 * ─── Endpoints existentes (no refactorizados aún) ───────────────────────────
 *
 * GET    /api/search?q=&ctx=            → Búsqueda global (formato legacy)
 * POST   /api/observability/log         → Logging cliente (formato legacy)
 * GET    /api/maps/autocomplete         → Google Places autocomplete
 * GET    /api/maps/geocode              → Google Geocoding
 * POST   /api/soporte/ticket            → Crear ticket soporte (formato legacy)
 * PATCH  /api/soporte/ticket/:id        → Responder ticket (formato legacy)
 * POST   /api/email/sync                → Sincronizar Gmail
 * GET    /api/email/messages/:id        → Obtener mensaje email
 * PATCH  /api/email/messages/:id        → Acción sobre mensaje
 *
 * Formato respuesta ESTÁNDAR:
 *   Éxito:  { data: T, meta?: { page, pageSize, total, totalPages } }
 *   Error:  { error: { code: string, message: string, details?: unknown } }
 *
 * Códigos de error: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN,
 *                   CONFLICT, RATE_LIMITED, INTERNAL_ERROR
 */
