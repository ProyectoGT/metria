"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/roles";
import { useToast, Toaster } from "@/components/ui/toast";
import {
  Phone,
  Mail,
  User,
  ExternalLink,
  GitBranch,
  Database,
  Server,
  Plus,
  Pencil,
  Trash2,
  X,
  LifeBuoy,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactoSoporte = {
  id: number;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  cargo: string | null;
  orden: number;
};

type TicketSoporte = {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: number | null;
  nombre_usuario: string | null;
  tipo: string;
  asunto: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  respuesta: string | null;
  respondido_por_nombre: string | null;
  respondido_at: string | null;
};

type Props = {
  contactos: ContactoSoporte[];
  tickets: TicketSoporte[];
  currentUserId: number | null;
  currentUserRole: UserRole | null;
  currentUserNombre: string;
  supabaseDashboardUrl: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_TICKET: Record<string, string> = {
  "Problema técnico / Bug": `Descripción del problema:


Pasos para reproducirlo:
1.
2.
3.

Comportamiento esperado:


Comportamiento actual:


URL o sección afectada:`,

  "Creación de usuario": `Datos del nuevo usuario:
- Nombre completo:
- Correo electrónico:
- Rol (Agente / Responsable / Director / Administrador):
- Supervisor asignado (si aplica):
- Equipo (si aplica):

Observaciones:`,

  "Acceso o permisos": `Usuario afectado:


Recurso o sección a la que necesita acceso:


Motivo de la solicitud:


Urgencia (Alta / Media / Baja):`,

  "Nueva funcionalidad": `Funcionalidad solicitada:


Descripción detallada de lo que se necesita:


¿Para qué sirve? Beneficio esperado:


Prioridad sugerida (Alta / Media / Baja):`,

  "Duda o consulta": `Consulta:


Contexto adicional:`,

  "Solicitud de datos / informe": `Datos o informe solicitado:


Período o filtros (fechas, agentes, zonas...):


Formato preferido (pantalla / Excel / PDF):


Motivo:`,

  "Solicitud de información": `Información solicitada:


Motivo:


Urgencia (Alta / Media / Baja):`,

  "Otro": `Descripción de la solicitud:


Contexto adicional:`,
};

const PRIORIDAD_LABELS: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORIDAD_BADGES: Record<string, string> = {
  alta: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  media: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  baja: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
};

const ESTADO_LABELS: Record<string, string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const ESTADO_BADGES: Record<string, string> = {
  abierto: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  en_proceso: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  resuelto: "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  cerrado: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prioridadBadge(p: string) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        PRIORIDAD_BADGES[p] ?? "bg-gray-500/15 text-gray-600 dark:text-gray-400"
      }`}
    >
      {PRIORIDAD_LABELS[p] ?? p}
    </span>
  );
}

function estadoBadge(e: string) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ESTADO_BADGES[e] ?? "bg-gray-500/15 text-gray-600 dark:text-gray-400"
      }`}
    >
      {ESTADO_LABELS[e] ?? e}
    </span>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Form types ───────────────────────────────────────────────────────────────

type TicketForm = {
  tipo: string;
  asunto: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
};

type ContactoForm = {
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  cargo: string;
};

function emptyTicketForm(): TicketForm {
  return { tipo: "", asunto: "", descripcion: "", prioridad: "media" };
}

function emptyContactoForm(): ContactoForm {
  return {
    nombre: "",
    apellidos: "",
    telefono: "",
    email: "",
    cargo: "Administrador",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SoporteClient({
  contactos: initialContactos,
  tickets: initialTickets,
  currentUserId,
  currentUserRole,
  currentUserNombre,
  supabaseDashboardUrl,
}: Props) {
  const isAdmin = currentUserRole === "Administrador";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = useMemo(() => createClient() as any, []);
  const { toasts, toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [allTickets, setAllTickets] =
    useState<TicketSoporte[]>(initialTickets);
  const misTickets = allTickets.filter((t) => t.user_id === currentUserId);

  const [tab, setTab] = useState<"incidencia" | "mis-tickets">("incidencia");
  const [adminTab, setAdminTab] = useState<
    "tickets" | "contactos" | "recursos"
  >("tickets");

  // Ticket form
  const [ticketForm, setTicketForm] = useState<TicketForm>(emptyTicketForm());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Ticket detail (admin)
  const [detailTicket, setDetailTicket] = useState<TicketSoporte | null>(null);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [respuestaForm, setRespuestaForm] = useState("");
  const [estadoForm, setEstadoForm] = useState("");

  // Contactos
  const [contactos, setContactos] =
    useState<ContactoSoporte[]>(initialContactos);
  const [contactoModalOpen, setContactoModalOpen] = useState(false);
  const [editContactoId, setEditContactoId] = useState<number | null>(null);
  const [contactoForm, setContactoForm] = useState<ContactoForm>(
    emptyContactoForm()
  );
  const [savingContacto, setSavingContacto] = useState(false);
  const [contactoError, setContactoError] = useState<string | null>(null);
  const [deleteContactoId, setDeleteContactoId] = useState<number | null>(
    null
  );

  // ── Handlers: ticket form ──────────────────────────────────────────────────

  function handleTipoChange(tipo: string) {
    const template = TIPOS_TICKET[tipo] ?? "";
    setTicketForm((prev) => ({ ...prev, tipo, descripcion: template }));
  }

  async function handleSubmitTicket() {
    if (
      !ticketForm.tipo ||
      !ticketForm.asunto.trim() ||
      !ticketForm.descripcion.trim()
    )
      return;

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/soporte/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ticketForm,
          user_id: currentUserId,
          nombre_usuario: currentUserNombre || "Usuario",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error ?? "Error al enviar el ticket");
      } else {
        setAllTickets((prev) => [data.ticket, ...prev]);
        setTicketForm(emptyTicketForm());
        setTab("mis-tickets");
        toast("Ticket enviado correctamente");
      }
    } catch {
      setSendError("Error de conexión. Inténtalo de nuevo.");
    }

    setSending(false);
  }

  // ── Handlers: admin ticket update ─────────────────────────────────────────

  function openDetailTicket(ticket: TicketSoporte) {
    setDetailTicket(ticket);
    setEstadoForm(ticket.estado);
    setRespuestaForm(ticket.respuesta ?? "");
  }

  async function handleUpdateTicket() {
    if (!detailTicket) return;
    setUpdatingTicket(true);

    const updates: Partial<TicketSoporte> & { updated_at?: string } = {
      estado: estadoForm || detailTicket.estado,
    };

    if (respuestaForm.trim()) {
      updates.respuesta = respuestaForm.trim();
      updates.respondido_por_nombre = currentUserNombre;
      updates.respondido_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("tickets_soporte")
      .update(updates)
      .eq("id", detailTicket.id)
      .select()
      .single();

    if (error) {
      toast(`Error: ${error.message}`, "error");
    } else if (data) {
      setAllTickets((prev) =>
        prev.map((t) =>
          t.id === detailTicket.id ? (data as TicketSoporte) : t
        )
      );
      setDetailTicket(data as TicketSoporte);
      toast("Ticket actualizado");
    }

    setUpdatingTicket(false);
  }

  // ── Handlers: contacto CRUD ────────────────────────────────────────────────

  function openCreateContacto() {
    setEditContactoId(null);
    setContactoForm(emptyContactoForm());
    setContactoError(null);
    setContactoModalOpen(true);
  }

  function openEditContacto(c: ContactoSoporte) {
    setEditContactoId(c.id);
    setContactoForm({
      nombre: c.nombre,
      apellidos: c.apellidos ?? "",
      telefono: c.telefono ?? "",
      email: c.email ?? "",
      cargo: c.cargo ?? "Administrador",
    });
    setContactoError(null);
    setContactoModalOpen(true);
  }

  async function handleSaveContacto() {
    if (!contactoForm.nombre.trim()) return;
    setSavingContacto(true);
    setContactoError(null);

    const payload = {
      nombre: contactoForm.nombre.trim(),
      apellidos: contactoForm.apellidos.trim() || null,
      telefono: contactoForm.telefono.trim() || null,
      email: contactoForm.email.trim() || null,
      cargo: contactoForm.cargo.trim() || "Administrador",
    };

    if (editContactoId !== null) {
      const { data, error } = await supabase
        .from("contactos_soporte")
        .update(payload)
        .eq("id", editContactoId)
        .select()
        .single();

      if (error) {
        setContactoError(error.message);
      } else if (data) {
        setContactos((prev) =>
          prev.map((c) =>
            c.id === editContactoId ? (data as ContactoSoporte) : c
          )
        );
        toast("Contacto actualizado");
        setContactoModalOpen(false);
      }
    } else {
      const { data, error } = await supabase
        .from("contactos_soporte")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setContactoError(error.message);
      } else if (data) {
        setContactos((prev) => [...prev, data as ContactoSoporte]);
        toast("Contacto añadido");
        setContactoModalOpen(false);
      }
    }

    setSavingContacto(false);
  }

  async function handleDeleteContacto() {
    if (deleteContactoId === null) return;

    const { error } = await supabase
      .from("contactos_soporte")
      .delete()
      .eq("id", deleteContactoId);

    if (error) {
      toast(`Error al eliminar: ${error.message}`, "error");
    } else {
      setContactos((prev) => prev.filter((c) => c.id !== deleteContactoId));
      toast("Contacto eliminado");
      setDeleteContactoId(null);
    }
  }

  // ── Admin resources ────────────────────────────────────────────────────────

  const adminResources = [
    {
      nombre: "GitHub",
      descripcion: "Repositorio del código fuente",
      url: "https://github.com/ProyectoGT/metria",
      colorClass: "bg-gray-900",
      icon: GitBranch,
    },
    {
      nombre: "Vercel",
      descripcion: "Plataforma de despliegue y previews",
      url: "https://vercel.com/dashboard",
      colorClass: "bg-black",
      icon: Server,
    },
    {
      nombre: "Supabase",
      descripcion: "Base de datos, auth y almacenamiento",
      url: supabaseDashboardUrl,
      colorClass: "bg-emerald-600",
      icon: Database,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          VISTA ADMIN
      ═══════════════════════════════════════════════════════════════════════ */}
      {isAdmin ? (
        <div>
          {/* Tabs admin */}
          <div className="mb-6 flex gap-1 rounded-xl border border-border bg-background p-1">
            {(["tickets", "contactos", "recursos"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAdminTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  adminTab === t
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "tickets"
                  ? "Todos los tickets"
                  : t === "contactos"
                    ? "Contactos de soporte"
                    : "Recursos"}
                {t === "tickets" && allTickets.length > 0 && (
                  <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {allTickets.filter((x) => x.estado === "abierto").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Todos los tickets */}
          {adminTab === "tickets" && (
            <div>
              {/* Stats */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  ["abierto", "en_proceso", "resuelto", "cerrado"] as const
                ).map((estado) => {
                  const count = allTickets.filter(
                    (t) => t.estado === estado
                  ).length;
                  return (
                    <div
                      key={estado}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <p className="text-2xl font-bold text-text-primary">
                        {count}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {ESTADO_LABELS[estado]}
                      </p>
                    </div>
                  );
                })}
              </div>

              {allTickets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                  <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                  <p className="text-sm text-text-secondary">
                    No hay tickets de soporte todavía
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-background">
                        <th className="px-5 py-3 text-left font-medium text-text-secondary">
                          #
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-text-secondary">
                          Usuario
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-text-secondary">
                          Tipo
                        </th>
                        <th className="px-5 py-3 text-left font-medium text-text-secondary">
                          Asunto
                        </th>
                        <th className="w-24 px-5 py-3 text-center font-medium text-text-secondary">
                          Prioridad
                        </th>
                        <th className="w-28 px-5 py-3 text-center font-medium text-text-secondary">
                          Estado
                        </th>
                        <th className="w-36 px-5 py-3 text-left font-medium text-text-secondary">
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          onClick={() => openDetailTicket(ticket)}
                          className="cursor-pointer transition-colors hover:bg-background"
                        >
                          <td className="px-5 py-3.5 text-text-secondary">
                            #{ticket.id}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-text-primary">
                            {ticket.nombre_usuario ?? "—"}
                          </td>
                          <td className="px-5 py-3.5 text-text-secondary">
                            {ticket.tipo}
                          </td>
                          <td className="px-5 py-3.5 text-text-primary">
                            {ticket.asunto}
                          </td>
                          <td className="w-24 px-5 py-3.5 text-center">
                            {prioridadBadge(ticket.prioridad)}
                          </td>
                          <td className="w-28 px-5 py-3.5 text-center">
                            {estadoBadge(ticket.estado)}
                          </td>
                          <td className="w-36 px-5 py-3.5 text-xs text-text-secondary">
                            {formatDate(ticket.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Contactos */}
          {adminTab === "contactos" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  {contactos.length} contacto
                  {contactos.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={openCreateContacto}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  <Plus className="h-4 w-4" />
                  Añadir contacto
                </button>
              </div>

              {contactos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                  <User className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                  <p className="text-sm text-text-secondary">
                    No hay contactos configurados
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {contactos.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start justify-between rounded-xl border border-border bg-surface p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">
                            {c.nombre} {c.apellidos}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {c.cargo}
                          </p>
                          {c.telefono && (
                            <a
                              href={`tel:${c.telefono}`}
                              className="mt-1.5 flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-primary"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {c.telefono}
                            </a>
                          )}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-primary"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              {c.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditContacto(c)}
                          className="rounded p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteContactoId(c.id)}
                          className="rounded p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Recursos */}
          {adminTab === "recursos" && (
            <div>
              <p className="mb-4 text-sm text-text-secondary">
                Acceso directo a las herramientas de administración del
                proyecto.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {adminResources.map((r) => {
                  const Icon = r.icon;
                  return (
                    <a
                      key={r.nombre}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${r.colorClass} text-white`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text-primary transition-colors group-hover:text-primary">
                          {r.nombre}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {r.descripcion}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
            VISTA USUARIOS (Agente / Responsable / Director)
        ═══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-8">
          {/* Contactos de soporte */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Contactos de soporte
            </h2>
            {contactos.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No hay contactos configurados.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {contactos.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">
                        {c.nombre} {c.apellidos}
                      </p>
                      <p className="text-xs text-text-secondary">{c.cargo}</p>
                      {c.telefono && (
                        <a
                          href={`tel:${c.telefono}`}
                          className="mt-2 flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-primary"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {c.telefono}
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-primary"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {c.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs: Incidencia / Mis tickets */}
          <div>
            <div className="mb-5 flex gap-1 rounded-xl border border-border bg-background p-1">
              <button
                onClick={() => setTab("incidencia")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "incidencia"
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Nueva incidencia
              </button>
              <button
                onClick={() => setTab("mis-tickets")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "mis-tickets"
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Mis tickets
                {misTickets.length > 0 && (
                  <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {misTickets.length}
                  </span>
                )}
              </button>
            </div>

            {/* ── Formulario de incidencia ────────────────────────────────── */}
            {tab === "incidencia" && (
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="space-y-4">
                  {/* Tipo */}
                  <div>
                    <label className="text-xs font-medium text-text-secondary">
                      Tipo de incidencia *
                    </label>
                    <select
                      value={ticketForm.tipo}
                      onChange={(e) => handleTipoChange(e.target.value)}
                      className="input mt-1.5"
                    >
                      <option value="">Seleccionar tipo...</option>
                      {Object.keys(TIPOS_TICKET).map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Asunto + Prioridad */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-text-secondary">
                        Asunto *
                      </label>
                      <input
                        type="text"
                        value={ticketForm.asunto}
                        onChange={(e) =>
                          setTicketForm((prev) => ({
                            ...prev,
                            asunto: e.target.value,
                          }))
                        }
                        placeholder="Resumen breve del problema o solicitud"
                        className="input mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary">
                        Prioridad
                      </label>
                      <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
                        {(["alta", "media", "baja"] as const).map((p, i) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setTicketForm((prev) => ({
                                ...prev,
                                prioridad: p,
                              }))
                            }
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${
                              i > 0 ? "border-l border-border" : ""
                            } ${
                              ticketForm.prioridad === p
                                ? "bg-primary text-white"
                                : "bg-surface text-text-secondary hover:bg-background"
                            }`}
                          >
                            {PRIORIDAD_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Descripción con template */}
                  <div>
                    <label className="text-xs font-medium text-text-secondary">
                      Descripción *
                    </label>
                    <textarea
                      value={ticketForm.descripcion}
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          descripcion: e.target.value,
                        }))
                      }
                      placeholder="Describe el problema o la solicitud con el mayor detalle posible..."
                      rows={12}
                      className="input mt-1.5 resize-none font-mono text-xs leading-relaxed"
                    />
                    {ticketForm.tipo && (
                      <p className="mt-1 text-xs text-text-secondary">
                        La plantilla se ha cargado automáticamente. Rellena los
                        campos en blanco.
                      </p>
                    )}
                  </div>

                  {sendError && (
                    <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                      {sendError}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitTicket}
                      disabled={
                        sending ||
                        !ticketForm.tipo ||
                        !ticketForm.asunto.trim() ||
                        !ticketForm.descripcion.trim()
                      }
                      className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                    >
                      {sending ? "Enviando..." : "Enviar incidencia"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Mis tickets ──────────────────────────────────────────────── */}
            {tab === "mis-tickets" && (
              <div>
                {misTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                    <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                    <p className="text-sm text-text-secondary">
                      No has enviado ningún ticket todavía
                    </p>
                    <button
                      onClick={() => setTab("incidencia")}
                      className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-background"
                    >
                      Crear primera incidencia
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {misTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-xl border border-border bg-surface p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-text-secondary">
                                #{ticket.id}
                              </span>
                              <span className="text-text-secondary">·</span>
                              <span className="text-xs text-text-secondary">
                                {ticket.tipo}
                              </span>
                            </div>
                            <p className="mt-1 font-medium text-text-primary">
                              {ticket.asunto}
                            </p>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              {formatDate(ticket.created_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {estadoBadge(ticket.estado)}
                            {prioridadBadge(ticket.prioridad)}
                          </div>
                        </div>

                        {/* Respuesta del admin */}
                        {ticket.respuesta && (
                          <div className="mt-4 rounded-lg bg-success/10 p-3">
                            <p className="mb-1 text-xs font-medium text-success">
                              Respuesta del administrador:
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-text-primary">
                              {ticket.respuesta}
                            </p>
                            {ticket.respondido_por_nombre && (
                              <p className="mt-1.5 text-xs text-text-secondary">
                                — {ticket.respondido_por_nombre}
                                {ticket.respondido_at
                                  ? `, ${formatDate(ticket.respondido_at)}`
                                  : ""}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* Modal: detalle de ticket (admin) */}
      {detailTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-surface shadow-xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Ticket #{detailTicket.id} — {detailTicket.asunto}
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {detailTicket.nombre_usuario} ·{" "}
                  {formatDate(detailTicket.created_at)}
                </p>
              </div>
              <button
                onClick={() => setDetailTicket(null)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* Badges info */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {detailTicket.tipo}
                </span>
                <span className="text-text-secondary">·</span>
                {prioridadBadge(detailTicket.prioridad)}
                {estadoBadge(detailTicket.estado)}
              </div>

              {/* Descripción */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-secondary">
                  Descripción
                </p>
                <div className="rounded-lg bg-background p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-text-primary">
                    {detailTicket.descripcion}
                  </pre>
                </div>
              </div>

              {/* Cambiar estado */}
              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Cambiar estado
                </label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(
                    [
                      "abierto",
                      "en_proceso",
                      "resuelto",
                      "cerrado",
                    ] as const
                  ).map((e) => (
                    <button
                      key={e}
                      onClick={() => setEstadoForm(e)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        estadoForm === e
                          ? "border-primary bg-primary text-white"
                          : "border-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {ESTADO_LABELS[e]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Respuesta */}
              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Respuesta al usuario
                </label>
                <textarea
                  value={respuestaForm}
                  onChange={(e) => setRespuestaForm(e.target.value)}
                  placeholder="Escribe una respuesta visible para el usuario..."
                  rows={4}
                  className="input mt-1.5 resize-none"
                />
              </div>

              {/* Respuesta existente */}
              {detailTicket.respuesta && (
                <div className="rounded-lg bg-success/10 p-3">
                  <p className="mb-1 text-xs font-medium text-success">
                    Respuesta guardada:
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text-primary">
                    {detailTicket.respuesta}
                  </p>
                  {detailTicket.respondido_por_nombre && (
                    <p className="mt-1 text-xs text-text-secondary">
                      — {detailTicket.respondido_por_nombre}
                      {detailTicket.respondido_at
                        ? `, ${formatDate(detailTicket.respondido_at)}`
                        : ""}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setDetailTicket(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cerrar
              </button>
              <button
                onClick={handleUpdateTicket}
                disabled={updatingTicket}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {updatingTicket ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: crear/editar contacto (admin) */}
      {contactoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                {editContactoId !== null ? "Editar contacto" : "Nuevo contacto"}
              </h2>
              <button
                onClick={() => setContactoModalOpen(false)}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={contactoForm.nombre}
                    onChange={(e) =>
                      setContactoForm((prev) => ({
                        ...prev,
                        nombre: e.target.value,
                      }))
                    }
                    className="input mt-1.5"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={contactoForm.apellidos}
                    onChange={(e) =>
                      setContactoForm((prev) => ({
                        ...prev,
                        apellidos: e.target.value,
                      }))
                    }
                    className="input mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Cargo
                </label>
                <input
                  type="text"
                  value={contactoForm.cargo}
                  onChange={(e) =>
                    setContactoForm((prev) => ({
                      ...prev,
                      cargo: e.target.value,
                    }))
                  }
                  className="input mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={contactoForm.telefono}
                  onChange={(e) =>
                    setContactoForm((prev) => ({
                      ...prev,
                      telefono: e.target.value,
                    }))
                  }
                  placeholder="+34 600 000 000"
                  className="input mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary">
                  Email
                </label>
                <input
                  type="email"
                  value={contactoForm.email}
                  onChange={(e) =>
                    setContactoForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="correo@ejemplo.com"
                  className="input mt-1.5"
                />
              </div>

              {contactoError && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  {contactoError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setContactoModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContacto}
                disabled={savingContacto || !contactoForm.nombre.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {savingContacto
                  ? "Guardando..."
                  : editContactoId !== null
                    ? "Guardar cambios"
                    : "Añadir contacto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación eliminar contacto */}
      {deleteContactoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">
              Eliminar contacto
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteContactoId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteContacto}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
