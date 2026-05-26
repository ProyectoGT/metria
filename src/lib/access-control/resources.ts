import type { UserRole } from "@/lib/roles";

export type ResourceType = "page" | "feature" | "action";
export type ResourceAction = "view" | "create" | "edit" | "delete" | "use" | "export" | "manage";

export interface AccessResource {
  key: string;
  type: ResourceType;
  label: string;
  description: string;
  defaultRoles: UserRole[];
  critical?: boolean;
}

const ALL_ROLES: UserRole[] = ["Administrador", "Director", "Responsable", "Agente"];
const MANAGER_ROLES: UserRole[] = ["Administrador", "Director"];
const SUPERVISOR_ROLES: UserRole[] = ["Administrador", "Director", "Responsable"];
const ADMIN_ONLY: UserRole[] = ["Administrador"];

export const ACCESS_RESOURCES: AccessResource[] = [
  // ── Páginas ─────────────────────────────────────────────
  {
    key: "dashboard",
    type: "page",
    label: "Dashboard",
    description: "Vista principal del CRM",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "zona",
    type: "page",
    label: "Zona",
    description: "Gestión de zonas, sectores, fincas y propiedades",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "propiedades",
    type: "page",
    label: "Propiedades",
    description: "Listado centralizado de inmuebles",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "solicitudes",
    type: "page",
    label: "Solicitudes",
    description: "Pedidos y leads de clientes",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "ordenes",
    type: "page",
    label: "Orden del día",
    description: "Actividades del día",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "calendario",
    type: "page",
    label: "Calendario",
    description: "Agenda y actividades",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "contactos",
    type: "page",
    label: "Contactos",
    description: "Agenda de contactos externos",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "email",
    type: "page",
    label: "Email",
    description: "Buzón y comunicaciones",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "desarrollo",
    type: "page",
    label: "Desarrollo",
    description: "Rendimiento y objetivos del equipo",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "insights",
    type: "page",
    label: "Insights",
    description: "Business intelligence",
    defaultRoles: SUPERVISOR_ROLES,
  },
  {
    key: "usuarios",
    type: "page",
    label: "Usuarios",
    description: "Gestión de accesos del equipo",
    defaultRoles: MANAGER_ROLES,
  },
  {
    key: "organigrama",
    type: "page",
    label: "Organigrama",
    description: "Estructura jerárquica del equipo",
    defaultRoles: SUPERVISOR_ROLES,
  },
  {
    key: "cuenta",
    type: "page",
    label: "Cuenta",
    description: "Perfil y seguridad",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "soporte",
    type: "page",
    label: "Soporte",
    description: "Centro de ayuda e incidencias",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "calculadora",
    type: "page",
    label: "Calculadora",
    description: "Herramientas de cálculo inmobiliario",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "comunicaciones",
    type: "page",
    label: "Comunicaciones",
    description: "Centro de WhatsApp y mensajería",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "configuracion",
    type: "page",
    label: "Configuración",
    description: "Ajustes del CRM (solo Administrador)",
    defaultRoles: ADMIN_ONLY,
  },
  {
    key: "backups",
    type: "page",
    label: "Copias de seguridad",
    description: "Centro de recuperacion, integridad y auditoria",
    defaultRoles: MANAGER_ROLES,
    critical: true,
  },

  // ── Funciones / Acciones ────────────────────────────────
  {
    key: "properties.create",
    type: "feature",
    label: "Crear propiedad",
    description: "Dar de alta nuevas propiedades",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "properties.edit",
    type: "feature",
    label: "Editar propiedad",
    description: "Modificar datos de propiedades",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "properties.delete",
    type: "feature",
    label: "Eliminar propiedad",
    description: "Eliminar propiedades del sistema",
    defaultRoles: ["Administrador", "Director", "Responsable"],
    critical: true,
  },
  {
    key: "properties.vendido",
    type: "feature",
    label: "Marcar como vendido",
    description: "Cambiar estado a vendido",
    defaultRoles: ["Administrador", "Director", "Responsable"],
  },
  {
    key: "properties.web_publish",
    type: "feature",
    label: "Publicar en web",
    description: "Gestionar publicación web de propiedades",
    defaultRoles: MANAGER_ROLES,
  },
  {
    key: "contacts.create",
    type: "feature",
    label: "Crear contacto",
    description: "Crear nuevos contactos",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "contacts.edit",
    type: "feature",
    label: "Editar contacto",
    description: "Modificar contactos existentes",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "contacts.delete",
    type: "feature",
    label: "Eliminar contacto",
    description: "Eliminar contactos",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "calendar.create",
    type: "feature",
    label: "Crear actividad",
    description: "Crear eventos en calendario",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "calendar.edit",
    type: "feature",
    label: "Editar actividad",
    description: "Modificar eventos del calendario",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "calendar.delete",
    type: "feature",
    label: "Eliminar actividad",
    description: "Eliminar eventos del calendario",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "calendar.google_sync",
    type: "feature",
    label: "Sincronizar Google Calendar",
    description: "Conectar y sincronizar con Google Calendar",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "tasks.create",
    type: "feature",
    label: "Crear tarea",
    description: "Crear nuevas tareas",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "tasks.edit",
    type: "feature",
    label: "Editar tarea",
    description: "Modificar tareas existentes",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "tasks.complete",
    type: "feature",
    label: "Completar tarea",
    description: "Marcar tareas como completadas",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "tasks.assign_others",
    type: "feature",
    label: "Asignar tareas a otros",
    description: "Asignar tareas y actividades a otros agentes",
    defaultRoles: SUPERVISOR_ROLES,
  },
  {
    key: "email.view",
    type: "feature",
    label: "Ver emails",
    description: "Acceder a la bandeja de correo",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "email.send",
    type: "feature",
    label: "Enviar emails",
    description: "Enviar correos desde el CRM",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "email.gmail_sync",
    type: "feature",
    label: "Sincronizar Gmail",
    description: "Conectar y sincronizar Gmail",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "users.create",
    type: "feature",
    label: "Crear usuario",
    description: "Dar de alta nuevos usuarios",
    defaultRoles: MANAGER_ROLES,
  },
  {
    key: "users.edit",
    type: "feature",
    label: "Editar usuario",
    description: "Modificar datos de usuarios",
    defaultRoles: MANAGER_ROLES,
  },
  {
    key: "users.delete",
    type: "feature",
    label: "Eliminar usuario",
    description: "Eliminar usuarios del sistema",
    defaultRoles: MANAGER_ROLES,
    critical: true,
  },
  {
    key: "users.change_role",
    type: "feature",
    label: "Cambiar rol",
    description: "Cambiar el rol de usuarios",
    defaultRoles: MANAGER_ROLES,
    critical: true,
  },
  {
    key: "zones.manage",
    type: "feature",
    label: "Gestionar zonas",
    description: "Crear, editar y reordenar zonas, sectores y fincas",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "zones.delete_sector",
    type: "feature",
    label: "Eliminar sector",
    description: "Eliminar sectores",
    defaultRoles: MANAGER_ROLES,
    critical: true,
  },
  {
    key: "zones.delete_zona",
    type: "feature",
    label: "Eliminar zona",
    description: "Eliminar zonas",
    defaultRoles: MANAGER_ROLES,
    critical: true,
  },
  {
    key: "data.export",
    type: "feature",
    label: "Exportar datos",
    description: "Exportar datos del CRM",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "documents.generate",
    type: "feature",
    label: "Generar documentos",
    description: "Generar fichas, encargos y documentos",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "metrics.view_all",
    type: "feature",
    label: "Ver métricas de otros",
    description: "Ver rendimiento y métricas de otros agentes",
    defaultRoles: SUPERVISOR_ROLES,
  },
  {
    key: "team.info",
    type: "feature",
    label: "Ver info del equipo",
    description: "Ver datos del equipo y compañeros",
    defaultRoles: ALL_ROLES,
  },
  {
    key: "soporte.respond",
    type: "feature",
    label: "Responder tickets",
    description: "Responder a tickets de soporte",
    defaultRoles: ADMIN_ONLY,
    critical: true,
  },
  {
    key: "collaborations.manage_all",
    type: "feature",
    label: "Gestionar colaboraciones",
    description: "Cancelar cualquier colaboración del sistema",
    defaultRoles: MANAGER_ROLES,
  },
  {
    key: "security.settings",
    type: "feature",
    label: "Config. seguridad",
    description: "Modificar contraseña de confirmación para operaciones destructivas",
    defaultRoles: ADMIN_ONLY,
    critical: true,
  },
  {
    key: "backup.create",
    type: "feature",
    label: "Crear backups",
    description: "Crear copias manuales del sistema",
    defaultRoles: ADMIN_ONLY,
    critical: true,
  },
  {
    key: "backup.restore",
    type: "feature",
    label: "Solicitar restauraciones",
    description: "Solicitar restauraciones protegidas por aprobacion",
    defaultRoles: MANAGER_ROLES,
    critical: true,
  },
  {
    key: "backup.download",
    type: "feature",
    label: "Descargar backups",
    description: "Descargar copias cifradas con reautenticacion",
    defaultRoles: ADMIN_ONLY,
    critical: true,
  },
];

export function getResourceByKey(key: string): AccessResource | undefined {
  return ACCESS_RESOURCES.find((r) => r.key === key);
}

export function getResourcesByType(type: ResourceType): AccessResource[] {
  return ACCESS_RESOURCES.filter((r) => r.type === type);
}
