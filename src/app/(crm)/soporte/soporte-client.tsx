"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy, Filter, Plus, Pencil, Trash2,
  Phone, Mail, User, ExternalLink, GitBranch, Database, Server,
  Archive, MessageSquare, Clock, AlertCircle, ChevronDown,
  LayoutList, Columns2, Bug, Lightbulb, HelpCircle, Headphones,
  Inbox, CheckCircle2, Play, CircleDot, Sparkles, ArrowRight, ClipboardList,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast, Toaster } from "@/components/ui/toast";
import Drawer from "@/components/ui/drawer";
import Avatar from "@/components/ui/avatar";
import FilterBar from "@/components/ui/filters/FilterBar";
import FilterSearch from "@/components/ui/filters/FilterSearch";
import FilterSelect from "@/components/ui/filters/FilterSelect";
import FilterToggle from "@/components/ui/filters/FilterToggle";
import FilterDrawer from "@/components/ui/filters/FilterDrawer";
import TicketDetailSidePanel from "@/modules/soporte/components/TicketDetailSidePanel";
import type { UserRole } from "@/lib/roles";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactoSoporte = {
  id: number; nombre: string; apellidos: string | null;
  telefono: string | null; email: string | null; cargo: string | null; orden: number;
};

type TicketRow = {
  id: number; created_at: string; updated_at: string | null;
  user_id: number | null; nombre_usuario: string | null;
  tipo: string; asunto: string; descripcion: string;
  prioridad: string; estado: string;
  respuesta: string | null; respondido_por_nombre: string | null; respondido_at: string | null;
  archived_at: string | null; asignado_a: number | null;
  empresa_id: number | null; ultima_respuesta_at: string | null;
};

type MessageRow = {
  id: number; ticket_id: number; autor_id: number | null;
  autor_nombre: string; autor_rol: string;
  contenido: string; es_sistema: boolean; created_at: string;
};

type UsuarioItem = { id: string; nombre: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_TICKET: Record<string, string> = {
  "Problema tecnico / Bug": "Descripcion del problema:\n\n\nPasos para reproducirlo:\n1.\n2.\n3.\n\nComportamiento esperado:\n\n\nComportamiento actual:\n\n\nURL o seccion afectada:",
  "Creacion de usuario": "Datos del nuevo usuario:\n- Nombre completo:\n- Correo electronico:\n- Rol:\n- Supervisor asignado:\n- Equipo:\n\nObservaciones:",
  "Acceso o permisos": "Usuario afectado:\n\n\nRecurso o seccion:\n\n\nMotivo:\n\n\nUrgencia:",
  "Nueva funcionalidad": "Funcionalidad solicitada:\n\n\nDescripcion:\n\n\nBeneficio esperado:\n\n\nPrioridad sugerida:",
  "Duda o consulta": "Consulta:\n\n\nContexto adicional:",
  "Solicitud de datos / informe": "Datos solicitados:\n\n\nPeriodo o filtros:\n\n\nFormato preferido:\n\n\nMotivo:",
  "Solicitud de informacion": "Informacion solicitada:\n\n\nMotivo:\n\n\nUrgencia:",
  "Otro": "Descripcion:\n\n\nContexto adicional:",
};

const ESTADOS = ["abierto", "en_proceso", "resuelto", "cerrado", "archivado"] as const;

const PRIORIDAD_LABELS: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const ESTADO_LABELS: Record<string, string> = {
  abierto: "Abierto", en_proceso: "En proceso", resuelto: "Resuelto",
  cerrado: "Cerrado", archivado: "Archivado",
};

const PRIORIDAD_CARD_BORDER: Record<string, string> = {
  alta: "border-l-red-500/60",
  media: "border-l-amber-500/60",
  baja: "border-l-blue-500/60",
};

const ESTADO_DOT: Record<string, string> = {
  abierto: "bg-blue-500", en_proceso: "bg-amber-500", resuelto: "bg-green-500",
  cerrado: "bg-gray-400", archivado: "bg-gray-400",
};

const COLORS_TIPO: Record<string, string> = {
  "Problema tecnico / Bug": "text-red-600 bg-red-500/10 border-red-500/20",
  "Nueva funcionalidad": "text-purple-600 bg-purple-500/10 border-purple-500/20",
  "Duda o consulta": "text-blue-600 bg-blue-500/10 border-blue-500/20",
  "Solicitud de datos / informe": "text-teal-600 bg-teal-500/10 border-teal-500/20",
  "Solicitud de informacion": "text-teal-600 bg-teal-500/10 border-teal-500/20",
};
function tipoStyle(t: string) {
  return COLORS_TIPO[t] ?? "text-text-secondary bg-surface-raised border-border";
}
function tipoIcon(t: string) {
  const l = t.toLowerCase();
  if (l.includes("bug") || l.includes("problema")) return Bug;
  if (l.includes("funcionalidad")) return Lightbulb;
  if (l.includes("duda") || l.includes("consulta")) return HelpCircle;
  return Headphones;
}

function statusBadgeClass(estado: string) {
  if (estado === "abierto") return "bg-blue-500/10 text-blue-600";
  if (estado === "en_proceso") return "bg-amber-500/10 text-amber-600";
  if (estado === "resuelto") return "bg-green-500/10 text-green-600";
  return "bg-gray-500/10 text-gray-500";
}

function priorityBadgeClass(prioridad: string) {
  if (prioridad === "alta") return "bg-red-500/10 text-red-600";
  if (prioridad === "media") return "bg-amber-500/10 text-amber-600";
  return "bg-blue-500/10 text-blue-600";
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatShort(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(iso));
}

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "hace minutos";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return `hace ${Math.floor(days / 7)}sem`;
}

function hsSince(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  contactos: ContactoSoporte[];
  tickets: TicketRow[];
  mensajes: MessageRow[];
  currentUserId: number | null;
  currentUserRole: UserRole | null;
  currentUserNombre: string;
  supabaseDashboardUrl: string;
  agents: UsuarioItem[];
};

// ─── Ticket Form ───────────────────────────────────────────────────────────────

type TicketFormState = {
  tipo: string; asunto: string; descripcion: string; prioridad: "alta" | "media" | "baja";
};
function emptyTicketForm(): TicketFormState {
  return { tipo: "", asunto: "", descripcion: "", prioridad: "media" };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SoporteClient({
  contactos: initialContactos, tickets: initialTickets, mensajes: initialMensajes,
  currentUserId, currentUserRole, currentUserNombre,
  supabaseDashboardUrl, agents: initialAgents,
}: Props) {
  const isAdmin = currentUserRole === "Administrador";
  const isDirector = currentUserRole === "Director";
  const isResponsable = currentUserRole === "Responsable";
  const searchParams = useSearchParams();
  const ticketParam = searchParams?.get("ticket");

  const supabase = useMemo(() => createClient(), []);
  const { toasts, toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets);
  const [mensajes] = useState<MessageRow[]>(initialMensajes);
  const [contactos, setContactos] = useState<ContactoSoporte[]>(initialContactos);
  const [agents] = useState<UsuarioItem[]>(initialAgents);

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [searchText, setSearchText] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterPrioridad, setFilterPrioridad] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterUsuario, setFilterUsuario] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [smartFilter, setSmartFilter] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Admin tabs
  const [adminTab, setAdminTab] = useState<"tickets" | "contactos" | "recursos">("tickets");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Ticket form (user)
  const [tab, setTab] = useState<"incidencia" | "mis-tickets">("incidencia");
  const [ticketForm, setTicketForm] = useState<TicketFormState>(emptyTicketForm());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Detail side panel
  const [detailTicketId, setDetailTicketId] = useState<number | null>(
    ticketParam ? Number(ticketParam) : null
  );

  // Contactos CRUD
  const [contactoModalOpen, setContactoModalOpen] = useState(false);
  const [editContactoId, setEditContactoId] = useState<number | null>(null);
  const [contactoForm, setContactoForm] = useState({ nombre: "", apellidos: "", telefono: "", email: "", cargo: "Administrador" });
  const [savingContacto, setSavingContacto] = useState(false);
  const [contactoError, setContactoError] = useState<string | null>(null);
  const [deleteContactoId, setDeleteContactoId] = useState<number | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────

  const tipos = useMemo(() => [...new Set(tickets.map((t) => t.tipo))].sort(), [tickets]);
  const usuarios = useMemo(
    () => [...new Set(tickets.map((t) => t.nombre_usuario).filter(Boolean) as string[])],
    [tickets]
  );

  const mensajesPorTicket = useMemo(() => {
    const map = new Map<number, MessageRow[]>();
    for (const m of mensajes) {
      const arr = map.get(m.ticket_id) ?? [];
      arr.push(m);
      map.set(m.ticket_id, arr);
    }
    return map;
  }, [mensajes]);

  const stats = useMemo(() => {
    const s = { abierto: 0, en_proceso: 0, resuelto: 0, cerrado: 0, archivado: 0, total: 0, sinRespuesta: 0, criticos: 0, antiguos: 0, misTickets: 0 };
    for (const t of tickets) {
      s[t.estado as keyof typeof s] = (s[t.estado as keyof typeof s] ?? 0) + 1;
      s.total++;
      const msgs = mensajesPorTicket.get(t.id) ?? [];
      const hasAdminReply = msgs.some((m) => m.autor_rol === "admin");
      if (!hasAdminReply && t.estado !== "cerrado" && t.estado !== "archivado" && t.estado !== "resuelto") s.sinRespuesta++;
      if (t.prioridad === "alta" && (t.estado === "abierto" || t.estado === "en_proceso")) s.criticos++;
      if (hsSince(t.ultima_respuesta_at ?? t.created_at) > 168 && t.estado !== "cerrado" && t.estado !== "archivado") s.antiguos++;
      if (t.asignado_a === currentUserId) s.misTickets++;
    }
    return s;
  }, [tickets, mensajesPorTicket, currentUserId]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (t.archived_at && !showArchived) return false;
      if (filterEstado && t.estado !== filterEstado) return false;
      if (filterPrioridad && t.prioridad !== filterPrioridad) return false;
      if (filterTipo && t.tipo !== filterTipo) return false;
      if (filterUsuario && t.nombre_usuario !== filterUsuario) return false;

      // Smart filters
      if (smartFilter === "sin-respuesta") {
        const msgs = mensajesPorTicket.get(t.id) ?? [];
        if (msgs.some((m) => m.autor_rol === "admin")) return false;
        if (t.estado === "cerrado" || t.estado === "archivado" || t.estado === "resuelto") return false;
      }
      if (smartFilter === "criticos") {
        if (t.prioridad !== "alta" || (t.estado !== "abierto" && t.estado !== "en_proceso")) return false;
      }
      if (smartFilter === "antiguos") {
        if (hsSince(t.ultima_respuesta_at ?? t.created_at) <= 168) return false;
        if (t.estado === "cerrado" || t.estado === "archivado") return false;
      }
      if (smartFilter === "mis-tickets") {
        if (t.asignado_a !== currentUserId) return false;
      }

      if (searchText) {
        const q = searchText.toLowerCase();
        if (!t.asunto.toLowerCase().includes(q) && !t.descripcion.toLowerCase().includes(q) &&
            !String(t.id).includes(q) && !(t.nombre_usuario ?? "").toLowerCase().includes(q) &&
            !t.tipo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, showArchived, filterEstado, filterPrioridad, filterTipo, filterUsuario, searchText, smartFilter, mensajesPorTicket, currentUserId]);

  const groupedTickets = useMemo(() => {
    const groups: Record<string, TicketRow[]> = {};
    for (const e of ESTADOS) {
      if (e === "archivado" && !showArchived) continue;
      groups[e] = [];
    }
    for (const t of filteredTickets) {
      if (groups[t.estado]) groups[t.estado].push(t);
    }
    return groups;
  }, [filteredTickets, showArchived]);

  const detailTicket = useMemo(() => {
    if (!detailTicketId) return null;
    return tickets.find((t) => t.id === detailTicketId) ?? null;
  }, [detailTicketId, tickets]);

  const detailMessages = useMemo(() => {
    if (!detailTicketId) return [];
    return mensajes
      .filter((m) => m.ticket_id === detailTicketId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m) => ({
        id: m.id,
        autorNombre: m.autor_nombre,
        autorRol: m.autor_rol as "usuario" | "admin" | "sistema",
        contenido: m.contenido,
        esSistema: m.es_sistema,
        createdAt: m.created_at,
      }));
  }, [detailTicketId, mensajes]);

  const misTickets = tickets.filter((t) => t.user_id === currentUserId);
  const roleView = isDirector ? "director" : isResponsable ? "responsable" : "agente";
  const roleCopy = {
    director: {
      eyebrow: "Panel de supervision",
      title: "Soporte operativo",
      description: "Vista consolidada de las solicitudes disponibles para tu rol, con foco en bloqueos, prioridades y seguimiento.",
      primaryAction: "Revisar tickets",
      secondaryAction: "Nueva solicitud",
    },
    responsable: {
      eyebrow: "Mesa de trabajo",
      title: "Soporte del equipo",
      description: "Seguimiento claro de incidencias, respuestas y solicitudes que requieren continuidad.",
      primaryAction: "Ver seguimiento",
      secondaryAction: "Crear incidencia",
    },
    agente: {
      eyebrow: "Centro de ayuda",
      title: "Mis solicitudes de soporte",
      description: "Crea incidencias, consulta respuestas y revisa en que punto esta cada solicitud.",
      primaryAction: "Ver mis tickets",
      secondaryAction: "Nueva incidencia",
    },
  }[roleView];

  const activeOwnTickets = misTickets.filter((t) => !["resuelto", "cerrado", "archivado"].includes(t.estado));
  const recentTickets = [...tickets]
    .filter((t) => !t.archived_at)
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
    .slice(0, 4);
  const roleStats = [
    {
      label: isDirector ? "Tickets abiertos" : "Activos",
      value: isDirector ? stats.abierto : activeOwnTickets.length,
      color: "text-blue-600",
      bg: "bg-blue-500/5",
      helper: isDirector ? "Pendientes de entrada" : "En curso o abiertos",
    },
    {
      label: "En proceso",
      value: stats.en_proceso,
      color: "text-amber-600",
      bg: "bg-amber-500/5",
      helper: "Con seguimiento",
    },
    {
      label: "Alta prioridad",
      value: stats.criticos,
      color: "text-red-600",
      bg: "bg-red-500/5",
      helper: "Requieren atencion",
    },
    {
      label: "Resueltos",
      value: stats.resuelto,
      color: "text-green-600",
      bg: "bg-green-500/5",
      helper: "Cerrados funcionalmente",
    },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────

  function handleTipoChange(tipo: string) {
    const template = TIPOS_TICKET[tipo] ?? "";
    setTicketForm((prev) => ({ ...prev, tipo, descripcion: template }));
  }

  async function handleSubmitTicket() {
    if (!ticketForm.tipo || !ticketForm.asunto.trim() || !ticketForm.descripcion.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const form = new FormData();
      form.set("tipo", ticketForm.tipo);
      form.set("asunto", ticketForm.asunto.trim());
      form.set("descripcion", ticketForm.descripcion.trim());
      form.set("prioridad", ticketForm.prioridad);
      const { createTicketAction } = await import("@/app/(crm)/soporte/actions");
      const result = await createTicketAction(form);
      if (result?.ticket) {
        setTickets((prev) => [result.ticket as TicketRow, ...prev]);
        setTicketForm(emptyTicketForm());
        setTab("mis-tickets");
        toast("Ticket enviado correctamente");
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Error al enviar");
    }
    setSending(false);
  }

  function openTicket(ticketId: number) {
    setDetailTicketId(ticketId);
  }

  function toggleGroup(estado: string) {
    setCollapsedGroups((prev) => ({ ...prev, [estado]: !prev[estado] }));
  }

  // Contactos handlers
  function openCreateContacto() {
    setEditContactoId(null);
    setContactoForm({ nombre: "", apellidos: "", telefono: "", email: "", cargo: "Administrador" });
    setContactoError(null);
    setContactoModalOpen(true);
  }
  function openEditContacto(c: ContactoSoporte) {
    setEditContactoId(c.id);
    setContactoForm({ nombre: c.nombre, apellidos: c.apellidos ?? "", telefono: c.telefono ?? "", email: c.email ?? "", cargo: c.cargo ?? "Administrador" });
    setContactoError(null);
    setContactoModalOpen(true);
  }
  async function handleSaveContacto() {
    if (!contactoForm.nombre.trim()) return;
    setSavingContacto(true);
    setContactoError(null);
    const payload = { nombre: contactoForm.nombre.trim(), apellidos: contactoForm.apellidos.trim() || null, telefono: contactoForm.telefono.trim() || null, email: contactoForm.email.trim() || null, cargo: contactoForm.cargo.trim() || "Administrador" };
    if (editContactoId !== null) {
      const { data, error } = await supabase.from("contactos_soporte").update(payload).eq("id", editContactoId).select().single();
      if (error) setContactoError(error.message);
      else if (data) { setContactos((prev) => prev.map((c) => c.id === editContactoId ? (data as ContactoSoporte) : c)); toast("Contacto actualizado"); setContactoModalOpen(false); }
    } else {
      const { data, error } = await supabase.from("contactos_soporte").insert(payload).select().single();
      if (error) setContactoError(error.message);
      else if (data) { setContactos((prev) => [...prev, data as ContactoSoporte]); toast("Contacto anadido"); setContactoModalOpen(false); }
    }
    setSavingContacto(false);
  }
  async function handleDeleteContacto() {
    if (deleteContactoId === null) return;
    const { error } = await supabase.from("contactos_soporte").delete().eq("id", deleteContactoId);
    if (error) toast(`Error: ${error.message}`, "error");
    else { setContactos((prev) => prev.filter((c) => c.id !== deleteContactoId)); toast("Contacto eliminado"); setDeleteContactoId(null); }
  }

  // ── Render: Ticket card ───────────────────────────────────────────────

  function renderTicketCard(t: TicketRow) {
    const msgs = mensajesPorTicket.get(t.id) ?? [];
    const lastMsg = msgs[msgs.length - 1];
    const lastActivity = lastMsg?.created_at ?? t.updated_at ?? t.created_at;
    const hasAdminReply = msgs.some((m) => m.autor_rol === "admin");
    const TipoIconComp = tipoIcon(t.tipo);
    const borderColor = PRIORIDAD_CARD_BORDER[t.prioridad] ?? "border-l-border";

    return (
      <motion.button
        key={t.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        onClick={() => openTicket(t.id)}
        className={`group relative w-full rounded-xl border border-border bg-surface text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${borderColor} border-l-[3px] overflow-hidden`}
      >
        <div className="p-4">
          {/* Row 1: ID + tipo badge + status + priority */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-text-secondary/50">#{t.id}</span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${tipoStyle(t.tipo)}`}>
              <TipoIconComp className="h-3 w-3" />
              <span className="max-w-[100px] truncate">{t.tipo}</span>
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              t.prioridad === "alta" ? "bg-red-500/10 text-red-600" :
              t.prioridad === "media" ? "bg-amber-500/10 text-amber-600" :
              "bg-blue-500/10 text-blue-600"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                t.prioridad === "alta" ? "bg-red-500" :
                t.prioridad === "media" ? "bg-amber-500" : "bg-blue-500"
              }`} />
              {PRIORIDAD_LABELS[t.prioridad] ?? t.prioridad}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              t.estado === "abierto" ? "bg-blue-500/10 text-blue-600" :
              t.estado === "en_proceso" ? "bg-amber-500/10 text-amber-600" :
              t.estado === "resuelto" ? "bg-green-500/10 text-green-600" :
              "bg-gray-500/10 text-gray-500"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[t.estado] ?? "bg-gray-400"}`} />
              {ESTADO_LABELS[t.estado] ?? t.estado}
            </span>
            {t.archived_at && (
              <span className="rounded bg-gray-500/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                <Archive className="mr-0.5 inline h-3 w-3" />
                Archivado
              </span>
            )}
          </div>

          {/* Row 2: Title */}
          <h3 className="mb-1.5 text-sm font-semibold text-text-primary">{t.asunto}</h3>

          {/* Row 3: Last activity preview */}
          {lastMsg && (
            <div className="mb-2 rounded-lg bg-background/50 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary/60">
                <MessageSquare className="h-3 w-3" />
                <span className="font-medium">{lastMsg.autor_nombre}</span>
                <span className="text-text-secondary/30">·</span>
                <span>{timeAgo(lastMsg.created_at) ?? formatShort(lastMsg.created_at)}</span>
                {!hasAdminReply && t.estado !== "cerrado" && t.estado !== "archivado" && t.estado !== "resuelto" && (
                  <>
                    <span className="text-text-secondary/30">·</span>
                    <span className="text-red-500/70">Sin respuesta</span>
                  </>
                )}
              </div>
              <p className="line-clamp-1 text-xs text-text-secondary/70">{lastMsg.contenido}</p>
            </div>
          )}

          {/* Row 4: User info + metadata */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary/50">
            {t.nombre_usuario && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {t.nombre_usuario}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(lastActivity) ?? formatShort(lastActivity)}
            </span>
            {t.asignado_a && (
              <span className="flex items-center gap-1 text-primary/60">
                <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
                Asignado
              </span>
            )}
            {msgs.length > 1 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {msgs.length}
              </span>
            )}
          </div>
        </div>
      </motion.button>
    );
  }

  // ── Render: Grouped section ────────────────────────────────────────────

  function renderGroupedSection(estado: string, ticketList: TicketRow[]) {
    if (ticketList.length === 0) return null;
    const isCollapsed = collapsedGroups[estado] ?? false;
    const iconMap: Record<string, React.ElementType> = {
      abierto: Inbox, en_proceso: Play, resuelto: CheckCircle2,
      cerrado: CircleDot, archivado: Archive,
    };
    const Icon = iconMap[estado] ?? Inbox;

    return (
      <motion.div key={estado} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
        <button
          onClick={() => toggleGroup(estado)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-raised"
        >
          <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
          <Icon className={`h-4 w-4 ${
            estado === "abierto" ? "text-blue-500" :
            estado === "en_proceso" ? "text-amber-500" :
            estado === "resuelto" ? "text-green-500" :
            estado === "cerrado" ? "text-gray-400" :
            "text-gray-400"
          }`} />
          <span className="text-sm font-semibold text-text-primary">{ESTADO_LABELS[estado] ?? estado}</span>
          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-text-secondary">{ticketList.length}</span>
        </button>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 grid gap-2 pl-8 sm:grid-cols-2 xl:grid-cols-3">
                {ticketList.map(renderTicketCard)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Render: Kanban column ──────────────────────────────────────────────

  function renderKanbanColumn(estado: string, ticketList: TicketRow[]) {
    if (ticketList.length === 0 && estado !== "abierto" && estado !== "en_proceso") return null;
    return (
      <div key={estado} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-background/50">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className={`h-2.5 w-2.5 rounded-full ${ESTADO_DOT[estado] ?? "bg-gray-400"}`} />
          <span className="text-sm font-semibold text-text-primary">{ESTADO_LABELS[estado] ?? estado}</span>
          <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-text-secondary">{ticketList.length}</span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {ticketList.map((t) => (
            <div key={t.id} onClick={() => openTicket(t.id)}
              className="cursor-pointer rounded-xl border border-border bg-surface p-3 shadow-sm transition-all hover:shadow-md">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${
                  t.prioridad === "alta" ? "bg-red-500" : t.prioridad === "media" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <span className="font-mono text-[10px] text-text-secondary/50">#{t.id}</span>
              </div>
              <p className="mb-1.5 text-xs font-semibold text-text-primary leading-snug">{t.asunto}</p>
              <div className="flex items-center gap-2 text-[10px] text-text-secondary/50">
                <User className="h-3 w-3" />
                <span className="truncate">{t.nombre_usuario ?? "—"}</span>
                <span className="ml-auto">{timeAgo(t.created_at)}</span>
              </div>
            </div>
          ))}
          {ticketList.length === 0 && (
            <div className="py-8 text-center text-[11px] text-text-secondary/40">No hay tickets</div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Smart filter pills ─────────────────────────────────────────

  const smartFilters = [
    { key: "", label: "Todos", icon: Inbox, count: undefined },
    { key: "sin-respuesta", label: "Sin respuesta", icon: MessageSquare, count: stats.sinRespuesta },
    { key: "criticos", label: "Criticos", icon: AlertCircle, count: stats.criticos },
    { key: "antiguos", label: "Antiguos", icon: Clock, count: stats.antiguos },
    { key: "mis-tickets", label: "Mis tickets", icon: User, count: stats.misTickets },
  ];

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <>
      {isAdmin ? (
        /* ═══════════════════════════════════════════════════════════════
           ADMIN VIEW — redesigned
        ═══════════════════════════════════════════════════════════════ */
        <div>
          {/* ── Tabs: Tickets / Contactos / Recursos ── */}
          <div className="mb-4 flex gap-1 rounded-xl border border-border bg-background p-1 overflow-x-auto">
            {(["tickets", "contactos", "recursos"] as const).map((t) => (
              <button key={t} onClick={() => setAdminTab(t)}
                className={`flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition-colors ${
                  adminTab === t ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "tickets" ? "Tickets" : t === "contactos" ? "Contactos" : "Recursos"}
                {t === "tickets" && (
                  <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {tickets.filter((x) => !x.archived_at).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tickets tab ── */}
          {adminTab === "tickets" && (
            <div>
              {/* Stats row */}
              <div className="mb-4 grid grid-cols-5 gap-2">
                {[
                  { label: "Abiertos", value: stats.abierto, color: "text-blue-600", bg: "bg-blue-500/5" },
                  { label: "En proceso", value: stats.en_proceso, color: "text-amber-600", bg: "bg-amber-500/5" },
                  { label: "Resueltos", value: stats.resuelto, color: "text-green-600", bg: "bg-green-500/5" },
                  { label: "Sin respuesta", value: stats.sinRespuesta, color: "text-red-600", bg: "bg-red-500/5" },
                  { label: "Criticos", value: stats.criticos, color: "text-red-600", bg: "bg-red-500/5" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl ${s.bg} border border-border/60 px-3 py-2.5`}>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[11px] text-text-secondary">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Smart filters */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                {smartFilters.map((f) => {
                  const IconF = f.icon;
                  const isActive = smartFilter === f.key;
                  return (
                    <button key={f.key} onClick={() => setSmartFilter(f.key)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-primary bg-primary/8 text-primary"
                          : "border-border text-text-secondary hover:border-text-secondary/30 hover:text-text-primary"
                      }`}
                    >
                      <IconF className="h-3.5 w-3.5" />
                      {f.label}
                      {f.count !== undefined && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          isActive ? "bg-primary/15" : "bg-surface-raised"
                        }`}>{f.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Filters + View toggle */}
              <FilterBar
                searchSlot={
                  <FilterSearch
                    value={searchText}
                    onChange={setSearchText}
                    placeholder="Buscar tickets..."
                    className="w-48"
                  />
                }
                activeCount={(() => {
                  let c = 0;
                  if (searchText) c++;
                  if (filterEstado) c++;
                  if (filterPrioridad) c++;
                  if (filterTipo) c++;
                  if (filterUsuario) c++;
                  if (showArchived) c++;
                  return c;
                })()}
                onClear={() => {
                  setSearchText("");
                  setFilterEstado("");
                  setFilterPrioridad("");
                  setFilterTipo("");
                  setFilterUsuario("");
                  setShowArchived(false);
                }}
                onOpenAdvanced={() => setDrawerOpen(true)}
                advancedCount={(() => {
                  let c = 0;
                  if (filterTipo) c++;
                  if (filterUsuario) c++;
                  if (showArchived) c++;
                  return c;
                })()}
                chips={(() => {
                  const c: { key: string; label: string; onRemove: () => void }[] = [];
                  if (filterEstado) c.push({ key: "estado", label: `Estado: ${ESTADO_LABELS[filterEstado] ?? filterEstado}`, onRemove: () => setFilterEstado("") });
                  if (filterPrioridad) c.push({ key: "prio", label: `Prioridad: ${PRIORIDAD_LABELS[filterPrioridad] ?? filterPrioridad}`, onRemove: () => setFilterPrioridad("") });
                  if (filterTipo) c.push({ key: "tipo", label: `Tipo: ${filterTipo}`, onRemove: () => setFilterTipo("") });
                  if (filterUsuario) c.push({ key: "user", label: `Usuario: ${filterUsuario}`, onRemove: () => setFilterUsuario("") });
                  if (showArchived) c.push({ key: "arch", label: "Archivados", onRemove: () => setShowArchived(false) });
                  return c;
                })()}
              >
                <FilterSelect
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  label="Estado"
                >
                  <option value="">Todos estados</option>
                  {ESTADOS.filter((e) => e !== "archivado" || showArchived).map((e) => (
                    <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  value={filterPrioridad}
                  onChange={(e) => setFilterPrioridad(e.target.value)}
                  label="Prioridad"
                >
                  <option value="">Toda prioridad</option>
                  {Object.entries(PRIORIDAD_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </FilterSelect>

                {/* View toggle */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-text-secondary/60">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}</span>
                  <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
                    <button onClick={() => setViewMode("list")}
                      className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
                      title="Vista lista">
                      <LayoutList className="h-4 w-4" />
                    </button>
                    <button onClick={() => setViewMode("kanban")}
                      className={`rounded-md p-1.5 transition-colors ${viewMode === "kanban" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
                      title="Vista kanban">
                      <Columns2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </FilterBar>

              {/* Drawer advanced filters */}
              <FilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title="Filtros avanzados"
                footer={
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { setFilterTipo(""); setFilterUsuario(""); setShowArchived(false); }}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
                    >
                      Limpiar avanzados
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                    >
                      Cerrar
                    </button>
                  </div>
                }
              >
                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Tipo</label>
                    <FilterSelect
                      value={filterTipo}
                      onChange={(e) => setFilterTipo(e.target.value)}
                    >
                      <option value="">Todo tipo</option>
                      {tipos.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </FilterSelect>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Usuario</label>
                    <FilterSelect
                      value={filterUsuario}
                      onChange={(e) => setFilterUsuario(e.target.value)}
                    >
                      <option value="">Todos usuarios</option>
                      {usuarios.map((u) => (<option key={u} value={u}>{u}</option>))}
                    </FilterSelect>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Estado</label>
                    <FilterToggle
                      label="Archivados"
                      active={showArchived}
                      onChange={setShowArchived}
                    />
                  </div>
                </div>
              </FilterDrawer>

              {/* Ticket list or Kanban */}
              {viewMode === "list" ? (
                <div className="space-y-1">
                  {ESTADOS.filter((e) => e !== "archivado" || showArchived).map((e) =>
                    renderGroupedSection(e, groupedTickets[e] ?? [])
                  )}
                  {filteredTickets.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                      <Filter className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                      <p className="text-sm text-text-secondary">No hay tickets con los filtros actuales</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {ESTADOS.filter((e) => e !== "archivado" || showArchived).map((e) =>
                    renderKanbanColumn(e, groupedTickets[e] ?? [])
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Contactos tab ── */}
          {adminTab === "contactos" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-text-secondary">{contactos.length} contacto{contactos.length !== 1 ? "s" : ""}</p>
                <button onClick={openCreateContacto} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">
                  <Plus className="h-4 w-4" /> Anadir contacto
                </button>
              </div>
              {contactos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                  <User className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                  <p className="text-sm text-text-secondary">No hay contactos configurados</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {contactos.map((c) => (
                    <div key={c.id} className="flex items-start justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-sm">
                      <div className="flex items-start gap-3">
                        <Avatar name={`${c.nombre} ${c.apellidos ?? ""}`} size="md" />
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary">{c.nombre} {c.apellidos}</p>
                          <p className="text-xs text-text-secondary">{c.cargo}</p>
                          {c.telefono && <a href={`tel:${c.telefono}`} className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary"><Phone className="h-3 w-3" />{c.telefono}</a>}
                          {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary"><Mail className="h-3 w-3" />{c.email}</a>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEditContacto(c)} className="rounded p-1.5 text-text-secondary hover:bg-background hover:text-text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteContactoId(c.id)} className="rounded p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Recursos tab ── */}
          {adminTab === "recursos" && (
            <div>
              <p className="mb-4 text-sm text-text-secondary">Acceso directo a las herramientas de administracion del proyecto.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { nombre: "GitHub", descripcion: "Repositorio del codigo fuente", url: "https://github.com/ProyectoGT/metria", colorClass: "bg-gray-900", icon: GitBranch },
                  { nombre: "Vercel", descripcion: "Plataforma de despliegue", url: "https://vercel.com/dashboard", colorClass: "bg-black", icon: Server },
                  { nombre: "Supabase", descripcion: "Base de datos, auth y almacenamiento", url: supabaseDashboardUrl, colorClass: "bg-emerald-600", icon: Database },
                ].map((r) => {
                  const IconR = r.icon;
                  return (
                    <a key={r.nombre} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/30 hover:shadow-md">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${r.colorClass} text-white`}><IconR className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text-primary group-hover:text-primary">{r.nombre}</p>
                        <p className="text-xs text-text-secondary">{r.descripcion}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-text-secondary opacity-0 group-hover:opacity-100" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-5 md:p-6">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {roleCopy.eyebrow}
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-2xl">
                    <h2 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">{roleCopy.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{roleCopy.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTab("mis-tickets")}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      <ClipboardList className="h-4 w-4" />
                      {roleCopy.primaryAction}
                    </button>
                    <button
                      onClick={() => setTab("incidencia")}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                    >
                      <Plus className="h-4 w-4" />
                      {roleCopy.secondaryAction}
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-background/45 p-5 lg:border-l lg:border-t-0">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Actividad reciente</p>
                {recentTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface py-8 text-center">
                    <MessageSquare className="mx-auto mb-2 h-6 w-6 text-text-secondary opacity-40" />
                    <p className="text-xs text-text-secondary">Sin actividad de soporte</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => openTicket(ticket.id)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left transition-all hover:border-primary/25 hover:shadow-sm"
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ESTADO_DOT[ticket.estado] ?? "bg-gray-400"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-text-primary">{ticket.asunto}</p>
                          <p className="text-[11px] text-text-secondary/60">#{ticket.id} - {timeAgo(ticket.updated_at ?? ticket.created_at) ?? formatShort(ticket.created_at)}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {roleStats.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setFilterEstado("");
                  setSmartFilter("");
                  if (s.label.includes("Alta")) setSmartFilter("criticos");
                  else if (s.label.includes("abiertos")) setFilterEstado("abierto");
                  else if (s.label.includes("proceso")) setFilterEstado("en_proceso");
                  else if (s.label.includes("Resueltos")) setFilterEstado("resuelto");
                  setTab("mis-tickets");
                }}
                className={`rounded-xl ${s.bg} border border-border/60 px-4 py-3 text-left transition-all hover:border-primary/25 hover:shadow-sm`}
              >
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs font-medium text-text-primary">{s.label}</p>
                <p className="mt-0.5 text-[11px] text-text-secondary">{s.helper}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm md:p-5">
              <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-background p-1">
                <button onClick={() => setTab("incidencia")}
                  className={`flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition-colors ${
                    tab === "incidencia" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}>Nueva incidencia</button>
                <button onClick={() => setTab("mis-tickets")}
                  className={`flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition-colors ${
                    tab === "mis-tickets" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                  }`}>Seguimiento {tickets.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{tickets.length}</span>}</button>
              </div>

              {tab === "incidencia" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background/45 p-4">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <LifeBuoy className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">Crear solicitud de soporte</h3>
                        <p className="mt-0.5 text-xs text-text-secondary">Completa el contexto para que soporte pueda priorizar y responder con rapidez.</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-text-secondary">Tipo de incidencia *</label>
                        <select value={ticketForm.tipo} onChange={(e) => handleTipoChange(e.target.value)} className="input mt-1.5">
                          <option value="">Seleccionar tipo...</option>
                          {Object.keys(TIPOS_TICKET).map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-text-secondary">Asunto *</label>
                          <input type="text" value={ticketForm.asunto}
                            onChange={(e) => setTicketForm((prev) => ({ ...prev, asunto: e.target.value }))}
                            placeholder="Resumen breve" className="input mt-1.5" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-text-secondary">Prioridad</label>
                          <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border bg-surface">
                            {(["alta", "media", "baja"] as const).map((p, i) => (
                              <button key={p} type="button" onClick={() => setTicketForm((prev) => ({ ...prev, prioridad: p }))}
                                className={`flex-1 py-2 text-sm font-medium transition-colors ${i > 0 ? "border-l border-border" : ""} ${
                                  ticketForm.prioridad === p ? "bg-primary text-white" : "text-text-secondary hover:bg-background"
                                }`}>{PRIORIDAD_LABELS[p]}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary">Descripcion *</label>
                        <textarea value={ticketForm.descripcion}
                          onChange={(e) => setTicketForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                          placeholder="Describe el problema..." rows={10} className="input mt-1.5 resize-none font-mono text-xs leading-relaxed" />
                      </div>
                      {sendError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{sendError}</p>}
                      <div className="flex justify-end">
                        <button onClick={handleSubmitTicket}
                          disabled={sending || !ticketForm.tipo || !ticketForm.asunto.trim() || !ticketForm.descripcion.trim()}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60">
                          {sending ? "Enviando..." : "Enviar incidencia"}
                          {!sending && <ArrowRight className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "mis-tickets" && (
                <div className="space-y-4">
                  <FilterBar
                    searchSlot={
                      <FilterSearch
                        value={searchText}
                        onChange={setSearchText}
                        placeholder="Buscar tickets..."
                        className="w-48"
                      />
                    }
                    activeCount={(() => {
                      let c = 0;
                      if (searchText) c++;
                      if (filterEstado) c++;
                      if (filterPrioridad) c++;
                      if (smartFilter) c++;
                      return c;
                    })()}
                    onClear={() => {
                      setSearchText("");
                      setFilterEstado("");
                      setFilterPrioridad("");
                      setSmartFilter("");
                    }}
                    chips={(() => {
                      const c: { key: string; label: string; onRemove: () => void }[] = [];
                      if (filterEstado) c.push({ key: "estado", label: `Estado: ${ESTADO_LABELS[filterEstado] ?? filterEstado}`, onRemove: () => setFilterEstado("") });
                      if (filterPrioridad) c.push({ key: "prio", label: `Prioridad: ${PRIORIDAD_LABELS[filterPrioridad] ?? filterPrioridad}`, onRemove: () => setFilterPrioridad("") });
                      if (smartFilter) c.push({ key: "focus", label: smartFilter === "criticos" ? "Alta prioridad" : "Filtro aplicado", onRemove: () => setSmartFilter("") });
                      return c;
                    })()}
                  >
                    <FilterSelect value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} label="Estado">
                      <option value="">Todos estados</option>
                      {ESTADOS.filter((e) => e !== "archivado").map((e) => (
                        <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                      ))}
                    </FilterSelect>
                    <FilterSelect value={filterPrioridad} onChange={(e) => setFilterPrioridad(e.target.value)} label="Prioridad">
                      <option value="">Toda prioridad</option>
                      {Object.entries(PRIORIDAD_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                    </FilterSelect>
                  </FilterBar>

                  {filteredTickets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background/45 py-16 text-center">
                      <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                      <p className="text-sm font-medium text-text-primary">{tickets.length === 0 ? "No hay tickets todavia" : "No hay tickets con los filtros actuales"}</p>
                      <p className="mt-1 text-xs text-text-secondary">{tickets.length === 0 ? "Crea una solicitud para iniciar el seguimiento." : "Prueba a limpiar filtros o cambiar la busqueda."}</p>
                      <button onClick={() => setTab("incidencia")} className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Crear incidencia</button>
                    </div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {filteredTickets.map((ticket) => {
                        const msgs = mensajesPorTicket.get(ticket.id) ?? [];
                        const hasAdminReply = msgs.some((m) => m.autor_rol === "admin");
                        const lastMsg = msgs[msgs.length - 1];
                        const TicketIcon = tipoIcon(ticket.tipo);
                        return (
                          <motion.button key={ticket.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            onClick={() => openTicket(ticket.id)}
                            className={`group relative overflow-hidden rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-all hover:border-primary/25 hover:shadow-md ${PRIORIDAD_CARD_BORDER[ticket.prioridad] ?? ""} border-l-[3px]`}
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] text-text-secondary/50">#{ticket.id}</span>
                              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${tipoStyle(ticket.tipo)}`}>
                                <TicketIcon className="h-3 w-3" />
                                <span className="max-w-[120px] truncate">{ticket.tipo}</span>
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityBadgeClass(ticket.prioridad)}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${ticket.prioridad === "alta" ? "bg-red-500" : ticket.prioridad === "media" ? "bg-amber-500" : "bg-blue-500"}`} />
                                {PRIORIDAD_LABELS[ticket.prioridad] ?? ticket.prioridad}
                              </span>
                            </div>
                            <p className="mb-2 line-clamp-2 text-sm font-semibold text-text-primary">{ticket.asunto}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-secondary/50">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(ticket.estado)}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[ticket.estado] ?? "bg-gray-400"}`} />
                                {ESTADO_LABELS[ticket.estado] ?? ticket.estado}
                              </span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(ticket.updated_at ?? ticket.created_at) ?? formatShort(ticket.created_at)}</span>
                              {hasAdminReply && <span className="text-green-500/80">Con respuesta</span>}
                            </div>
                            {lastMsg && (
                              <div className="mt-3 rounded-lg bg-background/60 px-2.5 py-2">
                                <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary/75">{lastMsg.contenido}</p>
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Contactos de soporte</h3>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-text-secondary">{contactos.length}</span>
                </div>
                {contactos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background/45 py-10 text-center">
                    <User className="mx-auto mb-2 h-6 w-6 text-text-secondary opacity-40" />
                    <p className="text-xs text-text-secondary">No hay contactos configurados.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contactos.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/35 p-3">
                        <Avatar name={`${c.nombre} ${c.apellidos ?? ""}`} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">{c.nombre} {c.apellidos}</p>
                          <p className="text-xs text-text-secondary">{c.cargo}</p>
                          {c.telefono && <a href={`tel:${c.telefono}`} className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary"><Phone className="h-3 w-3" />{c.telefono}</a>}
                          {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary"><Mail className="h-3 w-3" />{c.email}</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">Resumen por estado</h3>
                <div className="space-y-2">
                  {ESTADOS.filter((e) => e !== "archivado").map((estadoKey) => (
                    <button
                      key={estadoKey}
                      type="button"
                      onClick={() => { setFilterEstado(estadoKey); setTab("mis-tickets"); }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-background"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${ESTADO_DOT[estadoKey] ?? "bg-gray-400"}`} />
                      <span className="flex-1 text-xs font-medium text-text-secondary">{ESTADO_LABELS[estadoKey]}</span>
                      <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-text-primary">{stats[estadoKey as keyof typeof stats] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DETAIL SIDE PANEL
      ═══════════════════════════════════════════════════════════════ */}
      {detailTicket && (
        <TicketDetailSidePanel
          key={detailTicket.id}
          ticket={{
            id: detailTicket.id, asunto: detailTicket.asunto, tipo: detailTicket.tipo,
            prioridad: detailTicket.prioridad, estado: detailTicket.estado,
            nombreUsuario: detailTicket.nombre_usuario, createdAt: detailTicket.created_at!,
            ultimaRespuestaAt: detailTicket.ultima_respuesta_at,
            asignadoA: detailTicket.asignado_a, empresaId: detailTicket.empresa_id,
            archivedAt: detailTicket.archived_at,
          }}
          messages={detailMessages}
          isAdmin={isAdmin}
          isOwner={detailTicket.user_id === currentUserId}
          currentUserNombre={currentUserNombre}
          agents={agents}
          onClose={() => setDetailTicketId(null)}
          onRefresh={() => window.location.reload()}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CONTACTO DRAWERS
      ═══════════════════════════════════════════════════════════════ */}
      {contactoModalOpen && (
        <Drawer open={true} onClose={() => setContactoModalOpen(false)} width="md"
          title={editContactoId !== null ? "Editar contacto" : "Nuevo contacto"}>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-text-secondary">Nombre *</label>
                <input type="text" value={contactoForm.nombre} onChange={(e) => setContactoForm((p) => ({ ...p, nombre: e.target.value }))} className="input mt-1.5" autoFocus /></div>
              <div><label className="text-xs font-medium text-text-secondary">Apellidos</label>
                <input type="text" value={contactoForm.apellidos} onChange={(e) => setContactoForm((p) => ({ ...p, apellidos: e.target.value }))} className="input mt-1.5" /></div>
            </div>
            <div><label className="text-xs font-medium text-text-secondary">Cargo</label>
              <input type="text" value={contactoForm.cargo} onChange={(e) => setContactoForm((p) => ({ ...p, cargo: e.target.value }))} className="input mt-1.5" /></div>
            <div><label className="text-xs font-medium text-text-secondary">Telefono</label>
              <input type="tel" value={contactoForm.telefono} onChange={(e) => setContactoForm((p) => ({ ...p, telefono: e.target.value }))} placeholder="+34 600 000 000" className="input mt-1.5" /></div>
            <div><label className="text-xs font-medium text-text-secondary">Email</label>
              <input type="email" value={contactoForm.email} onChange={(e) => setContactoForm((p) => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" className="input mt-1.5" /></div>
            {contactoError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{contactoError}</p>}
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <button onClick={() => setContactoModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
            <button onClick={handleSaveContacto} disabled={savingContacto || !contactoForm.nombre.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
              {savingContacto ? "Guardando..." : editContactoId !== null ? "Guardar cambios" : "Anadir contacto"}
            </button>
          </div>
        </Drawer>
      )}

      {deleteContactoId !== null && (
        <Drawer open={true} onClose={() => setDeleteContactoId(null)} width="sm" title="Eliminar contacto">
          <div className="px-6 py-5">
            <p className="text-sm text-text-secondary">Esta accion no se puede deshacer.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteContactoId(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
              <button onClick={handleDeleteContacto} className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </Drawer>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
