"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  FileText,
  Image as ImageIcon,
  StickyNote,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

// ─── Types ────────────────────────────────────────────────────────────────────

type ArchivoEntry = {
  id: number;
  nombre: string;
  url: string | null;
  tipo: string;
  created_at: string;
};

type NotaEntry = {
  id: number;
  contenido: string;
  created_at: string;
};

type Propiedad = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  estado: string | null;
  notas: string | null;
};

type Tab = "documentos" | "imagenes" | "notas";

type EncargoPanelProps = {
  propiedad: Propiedad;
  onClose: () => void;
  onEdit: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function propLabel(p: Propiedad): string {
  if (p.propietario?.trim()) return p.propietario.trim();
  const parts = [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : `Propiedad #${p.id}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EncargoPanel({ propiedad, onClose, onEdit }: EncargoPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("documentos");
  const [archivos, setArchivos] = useState<ArchivoEntry[]>([]);
  const [notas, setNotas] = useState<NotaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-document form
  const [docNombre, setDocNombre] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);

  // Add-image form
  const [imgNombre, setImgNombre] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [savingImg, setSavingImg] = useState(false);

  // Add-note form
  const [notaTexto, setNotaTexto] = useState("");
  const [savingNota, setSavingNota] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: archivoData }, { data: notaData }] = await Promise.all([
        supabase
          .from("archivos")
          .select("id, nombre, url, tipo, created_at")
          .eq("propiedad_id", propiedad.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("encargo_notas")
          .select("id, contenido, created_at")
          .eq("propiedad_id", propiedad.id)
          .order("created_at", { ascending: false }),
      ]);
      setArchivos((archivoData as ArchivoEntry[]) ?? []);
      setNotas((notaData as NotaEntry[]) ?? []);
      setLoading(false);
    }
    load();
  }, [propiedad.id, supabase]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleAddDocumento() {
    if (!docNombre.trim()) return;
    setSavingDoc(true);
    const { data, error } = await supabase
      .from("archivos")
      .insert({
        nombre: docNombre.trim(),
        url: docUrl.trim() || null,
        tipo: "documento",
        propiedad_id: propiedad.id,
      })
      .select("id, nombre, url, tipo, created_at")
      .single();
    if (!error && data) {
      setArchivos((prev) => [data as ArchivoEntry, ...prev]);
      setDocNombre("");
      setDocUrl("");
    }
    setSavingDoc(false);
  }

  async function handleAddImagen() {
    if (!imgNombre.trim()) return;
    setSavingImg(true);
    const { data, error } = await supabase
      .from("archivos")
      .insert({
        nombre: imgNombre.trim(),
        url: imgUrl.trim() || null,
        tipo: "imagen",
        propiedad_id: propiedad.id,
      })
      .select("id, nombre, url, tipo, created_at")
      .single();
    if (!error && data) {
      setArchivos((prev) => [data as ArchivoEntry, ...prev]);
      setImgNombre("");
      setImgUrl("");
    }
    setSavingImg(false);
  }

  async function handleAddNota() {
    if (!notaTexto.trim()) return;
    setSavingNota(true);
    const { data, error } = await supabase
      .from("encargo_notas")
      .insert({ contenido: notaTexto.trim(), propiedad_id: propiedad.id })
      .select("id, contenido, created_at")
      .single();
    if (!error && data) {
      setNotas((prev) => [data as NotaEntry, ...prev]);
      setNotaTexto("");
    }
    setSavingNota(false);
  }

  async function handleDeleteArchivo(id: number) {
    await supabase.from("archivos").delete().eq("id", id);
    setArchivos((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDeleteNota(id: number) {
    await supabase.from("encargo_notas").delete().eq("id", id);
    setNotas((prev) => prev.filter((n) => n.id !== id));
  }

  const documentos = archivos.filter((a) => a.tipo === "documento");
  const imagenes = archivos.filter((a) => a.tipo === "imagen");

  // ── Render ───────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "documentos", label: "Documentos", icon: FileText, count: documentos.length },
    { key: "imagenes", label: "Imágenes", icon: ImageIcon, count: imagenes.length },
    { key: "notas", label: "Notas", icon: StickyNote, count: notas.length },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col bg-surface shadow-2xl sm:w-[520px]"
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-success/10 px-5 py-4 dark:bg-success/15">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                  Encargo
                </span>
              </div>
              <h2 className="truncate text-lg font-bold text-text-primary">
                {propLabel(propiedad)}
              </h2>
              {propiedad.telefono && (
                <p className="mt-0.5 text-sm text-text-secondary">{propiedad.telefono}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={onEdit}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              >
                Editar datos
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                aria-label="Cerrar panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex shrink-0 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-xs text-text-secondary">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-secondary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── DOCUMENTOS ── */}
              {activeTab === "documentos" && (
                <div className="space-y-4">
                  {/* Add form */}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Añadir documento
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={docNombre}
                        onChange={(e) => setDocNombre(e.target.value)}
                        placeholder="Nombre del documento (ej: Nota simple)"
                        className="input text-sm"
                      />
                      <input
                        type="url"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        placeholder="URL o enlace (opcional)"
                        className="input text-sm"
                      />
                      <button
                        onClick={handleAddDocumento}
                        disabled={savingDoc || !docNombre.trim()}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        {savingDoc ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Añadir
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  {documentos.length === 0 ? (
                    <EmptyState icon={FileText} text="No hay documentos todavía" />
                  ) : (
                    <ul className="space-y-2">
                      {documentos.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                        >
                          <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {doc.nombre}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {formatDateTime(doc.created_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1 text-text-secondary transition-colors hover:bg-blue-50 hover:text-blue-600"
                                title="Abrir enlace"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteArchivo(doc.id)}
                              className="rounded p-1 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── IMÁGENES ── */}
              {activeTab === "imagenes" && (
                <div className="space-y-4">
                  {/* Add form */}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Añadir imagen
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={imgNombre}
                        onChange={(e) => setImgNombre(e.target.value)}
                        placeholder="Descripción (ej: Fachada principal)"
                        className="input text-sm"
                      />
                      <input
                        type="url"
                        value={imgUrl}
                        onChange={(e) => setImgUrl(e.target.value)}
                        placeholder="URL de la imagen"
                        className="input text-sm"
                      />
                      <button
                        onClick={handleAddImagen}
                        disabled={savingImg || !imgNombre.trim()}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        {savingImg ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Añadir
                      </button>
                    </div>
                  </div>

                  {/* Grid */}
                  {imagenes.length === 0 ? (
                    <EmptyState icon={ImageIcon} text="No hay imágenes todavía" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {imagenes.map((img) => (
                        <div
                          key={img.id}
                          className="group relative overflow-hidden rounded-xl border border-border bg-background"
                        >
                          {img.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img.url}
                              alt={img.nombre}
                              className="h-36 w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-36 items-center justify-center bg-background">
                              <ImageIcon className="h-10 w-10 text-text-secondary/40" />
                            </div>
                          )}
                          <div className="px-3 py-2">
                            <p className="truncate text-xs font-medium text-text-primary">
                              {img.nombre}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {formatDateTime(img.created_at)}
                            </p>
                          </div>
                          {/* Overlay actions */}
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {img.url && (
                              <a
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-surface/90 p-1 shadow transition-colors hover:bg-surface"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-text-primary" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteArchivo(img.id)}
                              className="rounded-lg bg-white/90 p-1 shadow transition-colors hover:bg-danger/10"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-danger" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── NOTAS ── */}
              {activeTab === "notas" && (
                <div className="space-y-4">
                  {/* Add form */}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Nueva nota
                    </p>
                    <textarea
                      value={notaTexto}
                      onChange={(e) => setNotaTexto(e.target.value)}
                      placeholder="Escribe una nota sobre la operación..."
                      rows={3}
                      className="input resize-none text-sm"
                    />
                    <button
                      onClick={handleAddNota}
                      disabled={savingNota || !notaTexto.trim()}
                      className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                    >
                      {savingNota ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Guardar nota
                    </button>
                  </div>

                  {/* List */}
                  {notas.length === 0 ? (
                    <EmptyState icon={StickyNote} text="No hay notas todavía" />
                  ) : (
                    <ul className="space-y-3">
                      {notas.map((nota) => (
                        <li
                          key={nota.id}
                          className="group relative rounded-xl border border-border bg-background px-4 py-3"
                        >
                          <p className="pr-8 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                            {nota.contenido}
                          </p>
                          <p className="mt-2 text-xs text-text-secondary">
                            {formatDateTime(nota.created_at)}
                          </p>
                          <button
                            onClick={() => handleDeleteNota(nota.id)}
                            className="absolute right-2 top-2 rounded p-1 text-text-secondary opacity-0 transition-all group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                            title="Eliminar nota"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── EmptyState helper ────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background">
        <Icon className="h-6 w-6 text-text-secondary/50" />
      </div>
      <p className="text-sm text-text-secondary">{text}</p>
    </div>
  );
}
