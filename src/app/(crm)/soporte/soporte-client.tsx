"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LifeBuoy, Search, X, Filter, Plus, Pencil, Trash2,
  Phone, Mail, User, ExternalLink, GitBranch, Database, Server,
  Archive,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useToast, Toaster } from "@/components/ui/toast";
import Drawer from "@/components/ui/drawer";
import TicketDetailSidePanel from "@/components/soporte/TicketDetailSidePanel";
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
  "Problema técnico / Bug": "Descripción del problema:\n\n\nPasos para reproducirlo:\n1.\n2.\n3.\n\nComportamiento esperado:\n\n\nComportamiento actual:\n\n\nURL o sección afectada:",
  "Creación de usuario": "Datos del nuevo usuario:\n- Nombre completo:\n- Correo electrónico:\n- Rol:\n- Supervisor asignado:\n- Equipo:\n\nObservaciones:",
  "Acceso o permisos": "Usuario afectado:\n\n\nRecurso o sección:\n\n\nMotivo:\n\n\nUrgencia:",
  "Nueva funcionalidad": "Funcionalidad solicitada:\n\n\nDescripción:\n\n\nBeneficio esperado:\n\n\nPrioridad sugerida:",
  "Duda o consulta": "Consulta:\n\n\nContexto adicional:",
  "Solicitud de datos / informe": "Datos solicitados:\n\n\nPeríodo o filtros:\n\n\nFormato preferido:\n\n\nMotivo:",
  "Solicitud de información": "Información solicitada:\n\n\nMotivo:\n\n\nUrgencia:",
  "Otro": "Descripción:\n\n\nContexto adicional:",
};

const ESTADOS = ["abierto", "en_proceso", "resuelto", "cerrado", "archivado"] as const;

const PRIORIDAD_LABELS: Record<string, string> = {
  alta: "Alta", media: "Media", baja: "Baja",
};
const PRIORIDAD_BADGES: Record<string, string> = {
  alta: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  media: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  baja: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
};
const ESTADO_LABELS: Record<string, string> = {
  abierto: "Abierto", en_proceso: "En proceso", resuelto: "Resuelto",
  cerrado: "Cerrado", archivado: "Archivado",
};
const ESTADO_COLORS: Record<string, string> = {
  abierto: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  en_proceso: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  resuelto: "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  cerrado: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  archivado: "bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
};
const ESTADO_ICONS: Record<string, string> = {
  abierto: "🔵", en_proceso: "🟡", resuelto: "🟢", cerrado: "⚪", archivado: "📦",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "short",
  }).format(new Date(iso));
}

function prioridadBadge(p: string) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORIDAD_BADGES[p] ?? ""}`}>
      {PRIORIDAD_LABELS[p] ?? p}
    </span>
  );
}

function estadoBadge(e: string) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_COLORS[e] ?? ""}`}>
      {ESTADO_LABELS[e] ?? e}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Ticket Form ──────────────────────────────────────────────────────────────

type TicketFormState = {
  tipo: string; asunto: string; descripcion: string; prioridad: "alta" | "media" | "baja";
};

function emptyTicketForm(): TicketFormState {
  return { tipo: "", asunto: "", descripcion: "", prioridad: "media" };
}

type ContactoFormState = {
  nombre: string; apellidos: string; telefono: string; email: string; cargo: string;
};

function emptyContactoForm(): ContactoFormState {
  return { nombre: "", apellidos: "", telefono: "", email: "", cargo: "Administrador" };
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  searchText, setSearchText,
  filterEstado, setFilterEstado,
  filterPrioridad, setFilterPrioridad,
  showArchived, setShowArchived,
  tipos, usuarios,
  filterTipo, setFilterTipo,
  filterUsuario, setFilterUsuario,
}: {
  searchText: string; setSearchText: (v: string) => void;
  filterEstado: string; setFilterEstado: (v: string) => void;
  filterPrioridad: string; setFilterPrioridad: (v: string) => void;
  showArchived: boolean; setShowArchived: (v: boolean) => void;
  tipos: string[]; usuarios: string[];
  filterTipo: string; setFilterTipo: (v: string) => void;
  filterUsuario: string; setFilterUsuario: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
        <input
          type="text" value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Buscar tickets..."
          className="input h-9 pl-9 pr-8 text-sm"
        />
        {searchText && (
          <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}
        className="input h-9 w-auto text-xs">
        <option value="">Todos los estados</option>
        {ESTADOS.filter((e) => e !== "archivado" || showArchived).map((e) => (
          <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
        ))}
      </select>

      <select value={filterPrioridad} onChange={(e) => setFilterPrioridad(e.target.value)}
        className="input h-9 w-auto text-xs">
        <option value="">Toda prioridad</option>
        {Object.entries(PRIORIDAD_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}
        className="input h-9 w-auto text-xs">
        <option value="">Todo tipo</option>
        {tipos.map((t) => (<option key={t} value={t}>{t}</option>))}
      </select>

      <select value={filterUsuario} onChange={(e) => setFilterUsuario(e.target.value)}
        className="input h-9 w-auto text-xs">
        <option value="">Todos los usuarios</option>
        {usuarios.map((u) => (<option key={u} value={u}>{u}</option>))}
      </select>

      <button
        onClick={() => setShowArchived(!showArchived)}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
          showArchived
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-text-secondary hover:text-text-primary"
        }`}
      >
        <Archive className="h-3.5 w-3.5" />
        Archivados
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SoporteClient({
  contactos: initialContactos, tickets: initialTickets, mensajes: initialMensajes,
  currentUserId, currentUserRole, currentUserNombre,
  supabaseDashboardUrl, agents: initialAgents,
}: Props) {
  const isAdmin = currentUserRole === "Administrador";
  const searchParams = useSearchParams();
  const _ticketParam = searchParams?.get("ticket");

  const supabase = useMemo(() => createClient(), []);
  const { toasts, toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<TicketRow[]>(initialTickets);
  const [mensajes] = useState<MessageRow[]>(initialMensajes);
  const [contactos, setContactos] = useState<ContactoSoporte[]>(initialContactos);
  const [agents] = useState<UsuarioItem[]>(initialAgents);

  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [searchText, setSearchText] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterPrioridad, setFilterPrioridad] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterUsuario, setFilterUsuario] = useState("");

  // Tab admin
  const [adminTab, setAdminTab] = useState<"tickets" | "contactos" | "recursos">("tickets");

  // Ticket form (user)
  const [tab, setTab] = useState<"incidencia" | "mis-tickets">("incidencia");
  const [ticketForm, setTicketForm] = useState<TicketFormState>(emptyTicketForm());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Detail side panel
  const [detailTicketId, setDetailTicketId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Contactos CRUD
  const [contactoModalOpen, setContactoModalOpen] = useState(false);
  const [editContactoId, setEditContactoId] = useState<number | null>(null);
  const [contactoForm, setContactoForm] = useState<ContactoFormState>(emptyContactoForm());
  const [savingContacto, setSavingContacto] = useState(false);
  const [contactoError, setContactoError] = useState<string | null>(null);
  const [deleteContactoId, setDeleteContactoId] = useState<number | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────

  const tipos = useMemo(() => [...new Set(tickets.map((t) => t.tipo))].sort(), [tickets]);
  const usuarios = useMemo(
    () => [...new Set(tickets.map((t) => t.nombre_usuario).filter(Boolean) as string[])],
    [tickets]
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (t.archived_at && !showArchived) return false;
      if (filterEstado && t.estado !== filterEstado) return false;
      if (filterPrioridad && t.prioridad !== filterPrioridad) return false;
      if (filterTipo && t.tipo !== filterTipo) return false;
      if (filterUsuario && t.nombre_usuario !== filterUsuario) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!t.asunto.toLowerCase().includes(q) &&
            !t.descripcion.toLowerCase().includes(q) &&
            !String(t.id).includes(q) &&
            !(t.nombre_usuario ?? "").toLowerCase().includes(q) &&
            !t.tipo.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, showArchived, filterEstado, filterPrioridad, filterTipo, filterUsuario, searchText]);

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

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of ESTADOS) c[e] = 0;
    for (const t of tickets) {
      if (t.archived_at || t.estado !== "archivado") {
        c[t.estado] = (c[t.estado] ?? 0) + 1;
      }
    }
    return c;
  }, [tickets]);

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

  const _handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Contactos
  function openCreateContacto() {
    setEditContactoId(null);
    setContactoForm(emptyContactoForm());
    setContactoError(null);
    setContactoModalOpen(true);
  }

  function openEditContacto(c: ContactoSoporte) {
    setEditContactoId(c.id);
    setContactoForm({
      nombre: c.nombre, apellidos: c.apellidos ?? "",
      telefono: c.telefono ?? "", email: c.email ?? "",
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
        .from("contactos_soporte").update(payload).eq("id", editContactoId).select().single();
      if (error) { setContactoError(error.message); }
      else if (data) {
        setContactos((prev) => prev.map((c) => c.id === editContactoId ? (data as ContactoSoporte) : c));
        toast("Contacto actualizado");
        setContactoModalOpen(false);
      }
    } else {
      const { data, error } = await supabase
        .from("contactos_soporte").insert(payload).select().single();
      if (error) { setContactoError(error.message); }
      else if (data) {
        setContactos((prev) => [...prev, data as ContactoSoporte]);
        toast("Contacto añadido");
        setContactoModalOpen(false);
      }
    }
    setSavingContacto(false);
  }

  async function handleDeleteContacto() {
    if (deleteContactoId === null) return;
    const { error } = await supabase.from("contactos_soporte").delete().eq("id", deleteContactoId);
    if (error) { toast(`Error: ${error.message}`, "error"); }
    else {
      setContactos((prev) => prev.filter((c) => c.id !== deleteContactoId));
      toast("Contacto eliminado");
      setDeleteContactoId(null);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────

  function renderTicketRow(t: TicketRow) {
    return (
      <motion.tr
        key={t.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => openTicket(t.id)}
        className="cursor-pointer transition-colors hover:bg-background"
      >
        <td className="px-4 py-3 text-xs text-text-secondary">#{t.id}</td>
        <td className="px-4 py-3 font-medium text-text-primary">{t.asunto}</td>
        <td className="hidden px-4 py-3 text-xs text-text-secondary md:table-cell">{t.tipo}</td>
        <td className="hidden px-4 py-3 text-xs text-text-secondary sm:table-cell">{t.nombre_usuario ?? "—"}</td>
        <td className="px-4 py-3">{prioridadBadge(t.prioridad)}</td>
        <td className="px-4 py-3">{estadoBadge(t.estado)}</td>
        <td className="hidden px-4 py-3 text-xs text-text-secondary lg:table-cell">
          {formatShortDate(t.created_at!)}
        </td>
      </motion.tr>
    );
  }

  function renderGroupedSection(estado: string, ticketList: TicketRow[]) {
    if (ticketList.length === 0) return null;
    return (
      <motion.div
        key={estado}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {ESTADO_ICONS[estado] ?? "·"} {ESTADO_LABELS[estado] ?? estado}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_COLORS[estado] ?? ""}`}>
            {ticketList.length}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Asunto</th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-secondary md:table-cell">Tipo</th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-secondary sm:table-cell">Usuario</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary">Prioridad</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary">Estado</th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-secondary lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ticketList.map(renderTicketRow)}
            </tbody>
          </table>
        </div>
      </motion.div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          ADMIN VIEW
      ═══════════════════════════════════════════════════════════════ */}
      {isAdmin ? (
        <div>
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-xl border border-border bg-background p-1 overflow-x-auto">
            {(["tickets", "contactos", "recursos"] as const).map((t) => (
              <button key={t} onClick={() => setAdminTab(t)}
                className={`flex-1 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition-colors ${
                  adminTab === t
                    ? "bg-surface text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
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

          {/* ── Tickets tab ─────────────────────────────────────────── */}
          {adminTab === "tickets" && (
            <div>
              {/* Stats cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {ESTADOS.filter((e) => e !== "archivado" || showArchived).map((estado) => (
                  <button
                    key={estado}
                    onClick={() => setFilterEstado(filterEstado === estado ? "" : estado)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      filterEstado === estado
                        ? "border-primary ring-2 ring-primary/20 bg-surface"
                        : "border-border bg-surface hover:border-secondary/35"
                    }`}
                  >
                    <p className="text-2xl font-bold text-text-primary">{counts[estado] ?? 0}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">{ESTADO_LABELS[estado]}</p>
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="mb-5">
                <FilterBar
                  searchText={searchText} setSearchText={setSearchText}
                  filterEstado={filterEstado} setFilterEstado={setFilterEstado}
                  filterPrioridad={filterPrioridad} setFilterPrioridad={setFilterPrioridad}
                  showArchived={showArchived} setShowArchived={setShowArchived}
                  filterTipo={filterTipo} setFilterTipo={setFilterTipo}
                  filterUsuario={filterUsuario} setFilterUsuario={setFilterUsuario}
                  tipos={tipos} usuarios={usuarios}
                />
              </div>

              {/* View mode toggle */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
                  {showArchived && ` (${tickets.filter((t) => t.archived_at).length} archivados)`}
                </p>
                <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
                  <button onClick={() => setViewMode("grouped")}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      viewMode === "grouped" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                    }`}>Agrupado</button>
                  <button onClick={() => setViewMode("list")}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      viewMode === "list" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                    }`}>Lista</button>
                </div>
              </div>

              {/* Grouped view */}
              {viewMode === "grouped" ? (
                <div>
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
                /* List view */
                <div>
                  {filteredTickets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                      <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                      <p className="text-sm text-text-secondary">No hay tickets</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-background">
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">#</th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Asunto</th>
                            <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-secondary md:table-cell">Tipo</th>
                            <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-secondary sm:table-cell">Usuario</th>
                            <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary">Prioridad</th>
                            <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary">Estado</th>
                            <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-text-secondary lg:table-cell">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredTickets.map(renderTicketRow)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Contactos tab ───────────────────────────────────────── */}
          {adminTab === "contactos" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-text-secondary">{contactos.length} contacto{contactos.length !== 1 ? "s" : ""}</p>
                <button onClick={openCreateContacto}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">
                  <Plus className="h-4 w-4" /> Añadir contacto
                </button>
              </div>
              {contactos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                  <User className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                  <p className="text-sm text-text-secondary">No hay contactos configurados</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {contactos.map((c) => (
                    <div key={c.id} className="flex items-start justify-between rounded-xl border border-border bg-surface p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{c.nombre} {c.apellidos}</p>
                          <p className="text-xs text-text-secondary">{c.cargo}</p>
                          {c.telefono && <a href={`tel:${c.telefono}`} className="mt-1.5 flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary"><Phone className="h-3.5 w-3.5" />{c.telefono}</a>}
                          {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary"><Mail className="h-3.5 w-3.5" />{c.email}</a>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditContacto(c)} className="rounded p-1.5 text-text-secondary hover:bg-background hover:text-text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteContactoId(c.id)} className="rounded p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Recursos tab ─────────────────────────────────────────── */}
          {adminTab === "recursos" && (
            <div>
              <p className="mb-4 text-sm text-text-secondary">Acceso directo a las herramientas de administración del proyecto.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { nombre: "GitHub", descripcion: "Repositorio del código fuente", url: "https://github.com/ProyectoGT/metria", colorClass: "bg-gray-900", icon: GitBranch },
                  { nombre: "Vercel", descripcion: "Plataforma de despliegue", url: "https://vercel.com/dashboard", colorClass: "bg-black", icon: Server },
                  { nombre: "Supabase", descripcion: "Base de datos, auth y almacenamiento", url: supabaseDashboardUrl, colorClass: "bg-emerald-600", icon: Database },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <a key={r.nombre} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/30 hover:shadow-md">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${r.colorClass} text-white`}><Icon className="h-5 w-5" /></div>
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
        /* ═══════════════════════════════════════════════════════════════
            USER VIEW
        ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-8">
          {/* Contactos de soporte */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Contactos de soporte</h2>
            {contactos.length === 0 ? (
              <p className="text-sm text-text-secondary">No hay contactos configurados.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {contactos.map((c) => (
                  <div key={c.id} className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{c.nombre} {c.apellidos}</p>
                      <p className="text-xs text-text-secondary">{c.cargo}</p>
                      {c.telefono && <a href={`tel:${c.telefono}`} className="mt-2 flex items-center gap-2 text-sm text-text-secondary hover:text-primary"><Phone className="h-3.5 w-3.5" />{c.telefono}</a>}
                      {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary"><Mail className="h-3.5 w-3.5" />{c.email}</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs: Incidencia / Mis tickets */}
          <div>
            <div className="mb-5 flex gap-1 rounded-xl border border-border bg-background p-1">
              <button onClick={() => setTab("incidencia")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "incidencia" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                }`}>Nueva incidencia</button>
              <button onClick={() => setTab("mis-tickets")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "mis-tickets" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                }`}>Mis tickets {misTickets.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{misTickets.length}</span>}</button>
            </div>

            {tab === "incidencia" && (
              <div className="rounded-xl border border-border bg-surface p-6">
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
                      <div className="mt-1.5 flex overflow-hidden rounded-lg border border-border">
                        {(["alta", "media", "baja"] as const).map((p, i) => (
                          <button key={p} type="button" onClick={() => setTicketForm((prev) => ({ ...prev, prioridad: p }))}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${i > 0 ? "border-l border-border" : ""} ${
                              ticketForm.prioridad === p ? "bg-primary text-white" : "bg-surface text-text-secondary hover:bg-background"
                            }`}>{PRIORIDAD_LABELS[p]}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary">Descripción *</label>
                    <textarea value={ticketForm.descripcion}
                      onChange={(e) => setTicketForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Describe el problema..." rows={12} className="input mt-1.5 resize-none font-mono text-xs leading-relaxed" />
                    {ticketForm.tipo && <p className="mt-1 text-xs text-text-secondary">Plantilla cargada. Rellena los campos.</p>}
                  </div>
                  {sendError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{sendError}</p>}
                  <div className="flex justify-end">
                    <button onClick={handleSubmitTicket}
                      disabled={sending || !ticketForm.tipo || !ticketForm.asunto.trim() || !ticketForm.descripcion.trim()}
                      className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60">
                      {sending ? "Enviando..." : "Enviar incidencia"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "mis-tickets" && (
              <div>
                {misTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                    <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-text-secondary opacity-40" />
                    <p className="text-sm text-text-secondary">No has enviado ningún ticket todavía</p>
                    <button onClick={() => setTab("incidencia")} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-background">Crear primera incidencia</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {misTickets.map((ticket) => {
                      const ticketMsgs = mensajes.filter((m) => m.ticket_id === ticket.id);
                      const hasAdminReply = ticketMsgs.some((m) => m.autor_rol === "admin");
                      const _hasUserMsgs = ticketMsgs.filter((m) => m.autor_rol === "usuario");
                      const lastMsg = ticketMsgs[ticketMsgs.length - 1];
                      return (
                        <motion.div key={ticket.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          onClick={() => openTicket(ticket.id)}
                          className="cursor-pointer rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-background">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-text-secondary">#{ticket.id}</span>
                                <span className="text-text-secondary">·</span>
                                <span className="text-xs text-text-secondary">{ticket.tipo}</span>
                              </div>
                              <p className="mt-1 font-medium text-text-primary">{ticket.asunto}</p>
                              <p className="mt-0.5 text-xs text-text-secondary">{formatDate(ticket.created_at!)}</p>
                              {hasAdminReply && (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                                  Tiene respuesta
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              {estadoBadge(ticket.estado)}
                              {prioridadBadge(ticket.prioridad)}
                            </div>
                          </div>
                          {lastMsg && ticketMsgs.length > 0 && (
                            <div className="mt-3 rounded-lg bg-background px-3 py-2">
                              <p className="text-xs text-text-secondary">
                                <span className="font-medium">{lastMsg.autor_nombre}</span>
                                <span className="mx-1">·</span>
                                <span>{formatDate(lastMsg.created_at)}</span>
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-sm text-text-primary">{lastMsg.contenido}</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DETAIL SIDE PANEL
      ═══════════════════════════════════════════════════════════════ */}
      {detailTicket && (
        <TicketDetailSidePanel
          key={`${detailTicket.id}-${refreshKey}`}
          ticket={{
            id: detailTicket.id,
            asunto: detailTicket.asunto,
            tipo: detailTicket.tipo,
            prioridad: detailTicket.prioridad,
            estado: detailTicket.estado,
            nombreUsuario: detailTicket.nombre_usuario,
            createdAt: detailTicket.created_at!,
            ultimaRespuestaAt: detailTicket.ultima_respuesta_at,
            asignadoA: detailTicket.asignado_a,
            empresaId: detailTicket.empresa_id,
            archivedAt: detailTicket.archived_at,
          }}
          messages={detailMessages}
          isAdmin={isAdmin}
          isOwner={detailTicket.user_id === currentUserId}
          currentUserNombre={currentUserNombre}
          agents={agents}
          onClose={() => setDetailTicketId(null)}
          onRefresh={() => {
            window.location.reload();
          }}
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
            <div><label className="text-xs font-medium text-text-secondary">Teléfono</label>
              <input type="tel" value={contactoForm.telefono} onChange={(e) => setContactoForm((p) => ({ ...p, telefono: e.target.value }))} placeholder="+34 600 000 000" className="input mt-1.5" /></div>
            <div><label className="text-xs font-medium text-text-secondary">Email</label>
              <input type="email" value={contactoForm.email} onChange={(e) => setContactoForm((p) => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" className="input mt-1.5" /></div>
            {contactoError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{contactoError}</p>}
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <button onClick={() => setContactoModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
            <button onClick={handleSaveContacto} disabled={savingContacto || !contactoForm.nombre.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
              {savingContacto ? "Guardando..." : editContactoId !== null ? "Guardar cambios" : "Añadir contacto"}
            </button>
          </div>
        </Drawer>
      )}

      {deleteContactoId !== null && (
        <Drawer open={true} onClose={() => setDeleteContactoId(null)} width="sm" title="Eliminar contacto">
          <div className="px-6 py-5">
            <p className="text-sm text-text-secondary">Esta acción no se puede deshacer.</p>
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
