"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { RefreshCw, Mail, Phone, ExternalLink, MessageSquare, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { useToast, Toaster } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lead = {
  id: number;
  gmail_message_id: string;
  nombre: string | null;
  email_contacto: string | null;
  telefono: string | null;
  mensaje: string | null;
  referencia: string | null;
  url_propiedad: string | null;
  titulo_propiedad: string | null;
  asunto: string | null;
  fecha_contacto: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
};

type Props = {
  initialLeads: Lead[];
  gmailConnected: boolean;
};

// ─── Estado config ────────────────────────────────────────────────────────────

const ESTADOS = [
  { value: "nuevo", label: "Nuevo", icon: Clock, classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "gestionado", label: "Gestionado", icon: CheckCircle2, classes: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { value: "descartado", label: "Descartado", icon: XCircle, classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
] as const;

function estadoBadge(estado: string) {
  const e = ESTADOS.find((x) => x.value === estado) ?? ESTADOS[0];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.classes}`}>{e.label}</span>;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IdealistaClient({ initialLeads, gmailConnected }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [syncing, setSyncing] = useState(false);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingNota, setEditingNota] = useState<{ id: number; text: string } | null>(null);
  const [savingNota, setSavingNota] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const { toasts, toast } = useToast();

  const filtered = useMemo(() => {
    if (filterEstado === "todos") return leads;
    return leads.filter((l) => l.estado === filterEstado);
  }, [leads, filterEstado]);

  const counts = useMemo(() => ({
    todos: leads.length,
    nuevo: leads.filter((l) => l.estado === "nuevo").length,
    gestionado: leads.filter((l) => l.estado === "gestionado").length,
    descartado: leads.filter((l) => l.estado === "descartado").length,
  }), [leads]);

  // ── Sync ────────────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/google/gmail-sync", { method: "POST" });
      const data = await res.json();

      if (data.error === "gmail_not_connected") {
        toast("Gmail no esta conectado. Conecta tu correo primero.", "error");
        return;
      }
      if (data.error) {
        toast(`Error al sincronizar: ${data.error}`, "error");
        return;
      }

      if (data.imported > 0 && Array.isArray(data.leads)) {
        setLeads((prev) => [...(data.leads as Lead[]), ...prev]);
        toast(`${data.imported} lead${data.imported !== 1 ? "s" : ""} nuevo${data.imported !== 1 ? "s" : ""} importado${data.imported !== 1 ? "s" : ""} de Idealista`);
      } else {
        toast(data.message ?? "Todo sincronizado, sin novedades");
      }
    } catch {
      toast("Error de red al sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  }

  // ── Estado change ───────────────────────────────────────────────────────────

  async function handleEstadoChange(lead: Lead, estado: string) {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, estado } : l));
    const { error } = await supabase.from("idealista_leads").update({ estado }).eq("id", lead.id);
    if (error) {
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, estado: lead.estado } : l));
      toast("Error al actualizar estado", "error");
    }
  }

  // ── Nota save ───────────────────────────────────────────────────────────────

  async function handleSaveNota() {
    if (!editingNota) return;
    setSavingNota(true);
    const { error } = await supabase
      .from("idealista_leads")
      .update({ notas: editingNota.text || null })
      .eq("id", editingNota.id);
    if (!error) {
      setLeads((prev) => prev.map((l) => l.id === editingNota.id ? { ...l, notas: editingNota.text || null } : l));
      toast("Nota guardada");
      setEditingNota(null);
    } else {
      toast("Error al guardar nota", "error");
    }
    setSavingNota(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black text-orange-500">idealista</span>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
              Leads
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            {counts.nuevo > 0 && (
              <span className="mr-1.5 font-semibold text-orange-500">{counts.nuevo} nuevos</span>
            )}
            {counts.todos > 0 && <span className="text-text-secondary">{counts.todos} total</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!gmailConnected && (
            <a
              href="/api/google/gmail-auth"
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              <Mail className="h-4 w-4" />
              Conectar Gmail
            </a>
          )}
          {gmailConnected && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Sincronizando..." : "Sincronizar Gmail"}
            </button>
          )}
        </div>
      </div>

      {/* Info si Gmail no conectado */}
      {!gmailConnected && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="font-black text-orange-500">idealista</span>
            <span className="text-sm font-semibold text-text-primary">— Como conectar</span>
          </div>
          <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
            <li>Haz clic en <strong className="text-text-primary">Conectar Gmail</strong> y autoriza el acceso de solo lectura</li>
            <li>El CRM buscara emails de <strong className="text-text-primary">idealista.com</strong> de los ultimos 90 dias</li>
            <li>Extraera automaticamente nombre, telefono, email y mensaje de cada contacto</li>
            <li>Marca los leads como <strong className="text-text-primary">Gestionado</strong> o <strong className="text-text-primary">Descartado</strong> segun los vayas atendiendo</li>
          </ol>
        </div>
      )}

      {/* Filtros por estado */}
      {leads.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "todos", label: "Todos", count: counts.todos },
            { key: "nuevo", label: "Nuevos", count: counts.nuevo },
            { key: "gestionado", label: "Gestionados", count: counts.gestionado },
            { key: "descartado", label: "Descartados", count: counts.descartado },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilterEstado(key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterEstado === key
                  ? "bg-orange-500 text-white"
                  : "bg-background border border-border text-text-secondary hover:text-text-primary"
              }`}>
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterEstado === key ? "bg-white/30 text-white" : "bg-muted text-text-secondary"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <Mail className="h-6 w-6 text-orange-500" />
          </div>
          <p className="font-medium text-text-primary">No hay leads de Idealista todavia</p>
          <p className="mt-1 text-sm text-text-secondary">
            {gmailConnected ? "Haz clic en Sincronizar para importar los contactos" : "Conecta Gmail para empezar"}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-12 text-center">
          <p className="text-sm text-text-secondary">No hay leads con este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const expanded = expandedId === lead.id;
            return (
              <div key={lead.id} className={`rounded-xl border bg-surface shadow-sm transition-shadow hover:shadow-md ${
                lead.estado === "nuevo" ? "border-orange-200 dark:border-orange-900/40" : "border-border"
              }`}>
                {/* Card header */}
                <div
                  className="flex cursor-pointer items-start gap-4 p-4"
                  onClick={() => setExpandedId(expanded ? null : lead.id)}
                >
                  {/* Icono estado */}
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    lead.estado === "nuevo" ? "bg-blue-100 dark:bg-blue-900/30" :
                    lead.estado === "gestionado" ? "bg-green-100 dark:bg-green-900/30" :
                    "bg-gray-100 dark:bg-gray-800"
                  }`}>
                    <Mail className={`h-4 w-4 ${
                      lead.estado === "nuevo" ? "text-blue-600" :
                      lead.estado === "gestionado" ? "text-green-600" :
                      "text-gray-400"
                    }`} />
                  </div>

                  {/* Info principal */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-text-primary">
                          {lead.nombre ?? "Contacto sin nombre"}
                        </p>
                        {lead.titulo_propiedad && (
                          <p className="mt-0.5 truncate text-xs text-text-secondary">{lead.titulo_propiedad}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {estadoBadge(lead.estado)}
                        <span className="text-xs text-text-secondary">{formatDate(lead.fecha_contacto)}</span>
                      </div>
                    </div>

                    {/* Datos de contacto en una línea */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      {lead.email_contacto && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <a href={`mailto:${lead.email_contacto}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">
                            {lead.email_contacto}
                          </a>
                        </span>
                      )}
                      {lead.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${lead.telefono}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">
                            {lead.telefono}
                          </a>
                        </span>
                      )}
                      {lead.referencia && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          Ref. {lead.referencia}
                        </span>
                      )}
                    </div>

                    {/* Previsualización mensaje */}
                    {lead.mensaje && !expanded && (
                      <p className="mt-2 line-clamp-2 text-xs text-text-secondary">
                        <MessageSquare className="mr-1 inline h-3 w-3" />
                        {lead.mensaje}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                    {/* Mensaje completo */}
                    {lead.mensaje && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Mensaje</p>
                        <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm text-text-primary">
                          {lead.mensaje}
                        </p>
                      </div>
                    )}

                    {/* Asunto email */}
                    {lead.asunto && (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Asunto del email</p>
                        <p className="text-sm text-text-secondary">{lead.asunto}</p>
                      </div>
                    )}

                    {/* Notas del agente */}
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Notas internas</p>
                      {editingNota?.id === lead.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingNota.text}
                            onChange={(e) => setEditingNota({ ...editingNota, text: e.target.value })}
                            rows={3}
                            className="input resize-none text-sm"
                            placeholder="Anota lo que necesites sobre este lead..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={handleSaveNota} disabled={savingNota}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                              {savingNota ? "Guardando..." : "Guardar"}
                            </button>
                            <button onClick={() => setEditingNota(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-background">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingNota({ id: lead.id, text: lead.notas ?? "" })}
                          className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
                        >
                          {lead.notas ? (
                            <span className="text-text-primary">{lead.notas}</span>
                          ) : (
                            <span className="text-text-secondary/60">Clic para añadir nota...</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Cambio de estado */}
                      <div className="flex overflow-hidden rounded-lg border border-border">
                        {ESTADOS.map((e) => (
                          <button key={e.value} type="button"
                            onClick={() => handleEstadoChange(lead, e.value)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors first:border-l-0 border-l border-border ${
                              lead.estado === e.value
                                ? "bg-primary text-white"
                                : "text-text-secondary hover:bg-background"
                            }`}>
                            {e.label}
                          </button>
                        ))}
                      </div>

                      {/* Ver en Idealista */}
                      {lead.url_propiedad && (
                        <a href={lead.url_propiedad} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver en Idealista
                        </a>
                      )}

                      {/* Llamar */}
                      {lead.telefono && (
                        <a href={`tel:${lead.telefono}`}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary">
                          <Phone className="h-3.5 w-3.5" />
                          Llamar
                        </a>
                      )}

                      {/* Email */}
                      {lead.email_contacto && (
                        <a href={`mailto:${lead.email_contacto}`}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary">
                          <Mail className="h-3.5 w-3.5" />
                          Enviar email
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
