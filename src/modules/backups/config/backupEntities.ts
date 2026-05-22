import type { BackupEntityDefinition, BackupScopeKey } from "../types/backup.types";

export const BACKUP_ENTITIES: BackupEntityDefinition[] = [
  { key: "empresas", table: "empresas", label: "Empresas", scope: "security", enabled: true, sensitive: true },
  { key: "usuarios", table: "usuarios", label: "Usuarios", scope: "security", enabled: true, sensitive: true },
  { key: "access_control_rules", table: "access_control_rules", label: "Permisos", scope: "security", enabled: true, sensitive: true },
  { key: "configuracion_seguridad", table: "configuracion_seguridad", label: "Configuracion de seguridad", scope: "settings", enabled: true, sensitive: true },
  { key: "contactos", table: "contactos", label: "Contactos", scope: "crm", enabled: true },
  { key: "pedidos", table: "pedidos", label: "Solicitudes", scope: "crm", enabled: true },
  { key: "propiedades", table: "propiedades", label: "Propiedades", scope: "crm", enabled: true },
  { key: "zona", table: "zona", label: "Zonas", scope: "crm", enabled: true },
  { key: "sectores", table: "sectores", label: "Sectores", scope: "crm", enabled: true },
  { key: "fincas", table: "fincas", label: "Fincas", scope: "crm", enabled: true },
  { key: "agenda", table: "agenda", label: "Agenda", scope: "activity", enabled: true },
  { key: "agenda_usuarios", table: "agenda_usuarios", label: "Asignaciones de agenda", scope: "activity", enabled: true },
  { key: "tareas", table: "tareas", label: "Tareas", scope: "activity", enabled: true },
  { key: "tarea_usuarios", table: "tarea_usuarios", label: "Asignaciones de tareas", scope: "activity", enabled: true },
  { key: "usuario_orden", table: "usuario_orden", label: "Ordenes del dia", scope: "activity", enabled: true },
  { key: "kanban_columnas", table: "kanban_columnas", label: "Columnas Kanban", scope: "activity", enabled: true },
  { key: "kanban_card_orden", table: "kanban_card_orden", label: "Orden de cards Kanban", scope: "activity", enabled: true },
  { key: "archivos", table: "archivos", label: "Archivos", scope: "documents", enabled: true },
  { key: "documentos_generados", table: "documentos_generados", label: "Documentos generados", scope: "documents", enabled: true },
  { key: "email_accounts", table: "email_accounts", label: "Cuentas de email", scope: "communications", enabled: true, sensitive: true },
  { key: "email_messages", table: "email_messages", label: "Emails", scope: "communications", enabled: true },
  { key: "email_attachments", table: "email_attachments", label: "Adjuntos de email", scope: "communications", enabled: true },
  { key: "email_templates", table: "email_templates", label: "Plantillas email", scope: "communications", enabled: true },
  { key: "tickets_soporte", table: "tickets_soporte", label: "Tickets soporte", scope: "support", enabled: true },
  { key: "audit_log", table: "audit_log", label: "Auditoria general", scope: "audit", enabled: true },
  { key: "jobs", table: "jobs", label: "Jobs", scope: "jobs", enabled: true },
  { key: "job_schedules", table: "job_schedules", label: "Automatizaciones", scope: "jobs", enabled: true },
];

const SCOPE_TO_ENTITY_SCOPE: Partial<Record<BackupScopeKey, BackupEntityDefinition["scope"][]>> = {
  database: ["security", "crm", "activity", "documents", "communications", "support", "audit", "jobs", "settings"],
  settings: ["settings"],
  users: ["security"],
  contacts: ["crm"],
  properties: ["crm"],
  tasks_calendar: ["activity"],
  documents: ["documents"],
  communications: ["communications"],
  audit: ["audit"],
  automations: ["jobs"],
  templates: ["communications"],
};

export function getEntitiesForScope(scope: BackupScopeKey[]): BackupEntityDefinition[] {
  if (scope.includes("all")) {
    return BACKUP_ENTITIES.filter((entity) => entity.enabled);
  }

  const selectedScopes = new Set(
    scope.flatMap((key) => SCOPE_TO_ENTITY_SCOPE[key] ?? []),
  );

  return BACKUP_ENTITIES.filter((entity) => entity.enabled && selectedScopes.has(entity.scope));
}

export const BACKUP_SCOPE_OPTIONS: Array<{ key: BackupScopeKey; label: string; description: string }> = [
  { key: "all", label: "Todo Metria", description: "Incluye base de datos, archivos, configuracion y auditoria." },
  { key: "database", label: "Base de datos", description: "Export logico de las tablas configuradas." },
  { key: "storage", label: "Archivos / Storage", description: "Manifiesto de buckets privados y objetos relevantes." },
  { key: "settings", label: "Configuracion del CRM", description: "Preferencias, seguridad y ajustes internos." },
  { key: "users", label: "Usuarios, roles y permisos", description: "Equipo, roles, permisos y configuracion sensible." },
  { key: "contacts", label: "Clientes/contactos", description: "Contactos externos y solicitudes vinculadas." },
  { key: "properties", label: "Propiedades", description: "Inmuebles, zonas, sectores y fincas." },
  { key: "tasks_calendar", label: "Tareas y calendario", description: "Tareas, agenda, ordenes del dia y Kanban." },
  { key: "documents", label: "Documentos", description: "Metadatos de documentos y archivos del CRM." },
  { key: "communications", label: "Comunicaciones", description: "Email, plantillas y adjuntos registrados." },
  { key: "audit", label: "Auditoria", description: "Eventos de auditoria y trazabilidad." },
  { key: "automations", label: "Automatizaciones", description: "Jobs y programaciones internas." },
  { key: "templates", label: "Plantillas", description: "Plantillas de email y documentos." },
];
