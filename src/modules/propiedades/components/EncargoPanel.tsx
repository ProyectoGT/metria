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
  Download,
  Loader2,
  CalendarCheck,
  User,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

// ─── Types ────────────────────────────────────────────────────────────────────

type ArchivoEntry = {
  id: number;
  nombre: string;
  url: string | null;
  storage_path: string | null;
  tipo: string;
  created_at: string;
};

type NotaEntry = {
  id: number;
  contenido: string;
  created_at: string;
};

type VisitaEntry = {
  id: number;
  agente_id: number | null;
  agente_nombre: string;
  fecha_visita: string;
  observaciones: string | null;
  created_at: string;
};

type Agente = {
  id: number;
  nombre: string;
  apellidos: string;
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

// Upload progress per file
type UploadItem = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  nombre: string;
};

type Tab = "visitas" | "documentos" | "imagenes" | "notas";

type EncargoPanelProps = {
  propiedad: Propiedad;
  agentes: Agente[];
  currentUserId: number;
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

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function uniqueStorageName(filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : "";
  const base = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return ext ? `${base}.${ext}` : base;
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const BUCKET = "encargo-archivos";

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({
  accept,
  multiple,
  onFiles,
  children,
}: {
  accept: string;
  multiple: boolean;
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      if (!accept) return true;
      const exts = accept.split(",").map((s) => s.trim().toLowerCase());
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      const mime = f.type.toLowerCase();
      return exts.some((a) => a.startsWith(".") ? a === ext : mime.startsWith(a.replace("*", "")));
    });
    if (files.length) onFiles(files);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors ${
        dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary hover:bg-primary/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EncargoPanel({ propiedad, agentes, currentUserId, onClose, onEdit }: EncargoPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("visitas");
  const [archivos, setArchivos] = useState<ArchivoEntry[]>([]);
  const [notas, setNotas] = useState<NotaEntry[]>([]);
  const [visitas, setVisitas] = useState<VisitaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Visita form
  const [visitaFecha, setVisitaFecha] = useState(() => toDatetimeLocal(new Date()));
  const [visitaAgenteId, setVisitaAgenteId] = useState<string>(() => String(currentUserId));
  const [visitaObs, setVisitaObs] = useState("");
  const [savingVisita, setSavingVisita] = useState(false);
  const [visitaError, setVisitaError] = useState<string | null>(null);

  // Document upload queue
  const [docQueue, setDocQueue] = useState<UploadItem[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Image upload queue
  const [imgQueue, setImgQueue] = useState<UploadItem[]>([]);
  const [uploadingImgs, setUploadingImgs] = useState(false);

  // Note form
  const [notaTexto, setNotaTexto] = useState("");
  const [savingNota, setSavingNota] = useState(false);
  const [notaError, setNotaError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: archivoData }, { data: notaData }, { data: visitaData }] = await Promise.all([
        supabase
          .from("archivos")
          .select("id, nombre, url, storage_path, tipo, created_at")
          .eq("propiedad_id", propiedad.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("encargo_notas")
          .select("id, contenido, created_at")
          .eq("propiedad_id", propiedad.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("encargo_visitas")
          .select("id, agente_id, agente_nombre, fecha_visita, observaciones, created_at")
          .eq("propiedad_id", propiedad.id)
          .order("fecha_visita", { ascending: false }),
      ]);
      setArchivos((archivoData as ArchivoEntry[]) ?? []);
      setNotas((notaData as NotaEntry[]) ?? []);
      setVisitas((visitaData as VisitaEntry[]) ?? []);
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

  // ── Upload helper ─────────────────────────────────────────────────────────

  async function uploadFile(
    file: File,
    tipo: "documento" | "imagen"
  ): Promise<{ url: string; storage_path: string } | null> {
    const path = `${propiedad.id}/${tipo}s/${uniqueStorageName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, storage_path: path };
  }

  // ── Document queue handlers ───────────────────────────────────────────────

  function addDocFiles(files: File[]) {
    setDocQueue((prev) => [
      ...prev,
      ...files.map((f) => ({
        file: f,
        status: "pending" as const,
        nombre: f.name.replace(/\.[^.]+$/, ""),
      })),
    ]);
  }

  function removeDocFromQueue(idx: number) {
    setDocQueue((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDocNombre(idx: number, nombre: string) {
    setDocQueue((prev) => prev.map((item, i) => (i === idx ? { ...item, nombre } : item)));
  }

  async function handleUploadDocs() {
    if (docQueue.length === 0) return;
    setUploadingDocs(true);

    const newArchivos: ArchivoEntry[] = [];

    for (let i = 0; i < docQueue.length; i++) {
      const item = docQueue[i];
      if (item.status === "done") continue;

      setDocQueue((prev) => prev.map((x, j) => (j === i ? { ...x, status: "uploading" } : x)));

      const uploaded = await uploadFile(item.file, "documento");
      const url = uploaded?.url ?? null;
      const storage_path = uploaded?.storage_path ?? null;

      const { data, error } = await supabase
        .from("archivos")
        .insert({
          nombre: item.nombre.trim() || item.file.name,
          url,
          storage_path,
          tipo: "documento",
          propiedad_id: propiedad.id,
        })
        .select("id, nombre, url, storage_path, tipo, created_at")
        .single();

      if (!error && data) {
        newArchivos.push(data as ArchivoEntry);
        setDocQueue((prev) => prev.map((x, j) => (j === i ? { ...x, status: "done" } : x)));
      } else {
        setDocQueue((prev) => prev.map((x, j) => (j === i ? { ...x, status: "error" } : x)));
      }
    }

    setArchivos((prev) => [...newArchivos, ...prev]);
    setDocQueue((prev) => prev.filter((x) => x.status !== "done"));
    setUploadingDocs(false);
  }

  // ── Image queue handlers ───────────────────────────────────────────────────

  function addImgFiles(files: File[]) {
    setImgQueue((prev) => [
      ...prev,
      ...files.map((f) => ({
        file: f,
        status: "pending" as const,
        nombre: f.name.replace(/\.[^.]+$/, ""),
      })),
    ]);
  }

  function removeImgFromQueue(idx: number) {
    setImgQueue((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleUploadImgs() {
    if (imgQueue.length === 0) return;
    setUploadingImgs(true);

    const newArchivos: ArchivoEntry[] = [];

    for (let i = 0; i < imgQueue.length; i++) {
      const item = imgQueue[i];
      if (item.status === "done") continue;

      setImgQueue((prev) => prev.map((x, j) => (j === i ? { ...x, status: "uploading" } : x)));

      const uploaded = await uploadFile(item.file, "imagen");
      const url = uploaded?.url ?? null;
      const storage_path = uploaded?.storage_path ?? null;

      const { data, error } = await supabase
        .from("archivos")
        .insert({
          nombre: item.nombre.trim() || item.file.name,
          url,
          storage_path,
          tipo: "imagen",
          propiedad_id: propiedad.id,
        })
        .select("id, nombre, url, storage_path, tipo, created_at")
        .single();

      if (!error && data) {
        newArchivos.push(data as ArchivoEntry);
        setImgQueue((prev) => prev.map((x, j) => (j === i ? { ...x, status: "done" } : x)));
      } else {
        setImgQueue((prev) => prev.map((x, j) => (j === i ? { ...x, status: "error" } : x)));
      }
    }

    setArchivos((prev) => [...newArchivos, ...prev]);
    setImgQueue((prev) => prev.filter((x) => x.status !== "done"));
    setUploadingImgs(false);
  }

  // ── Visita handlers ───────────────────────────────────────────────────────

  async function handleAddVisita() {
    setSavingVisita(true);
    setVisitaError(null);

    const agenteId = visitaAgenteId ? Number(visitaAgenteId) : null;
    const agente = agentes.find((a) => a.id === agenteId);
    const agente_nombre = agente
      ? `${agente.nombre} ${agente.apellidos}`.trim()
      : "Agente desconocido";

    const { data, error } = await supabase
      .from("encargo_visitas")
      .insert({
        propiedad_id: propiedad.id,
        agente_id: agenteId,
        agente_nombre,
        fecha_visita: visitaFecha ? new Date(visitaFecha).toISOString() : new Date().toISOString(),
        observaciones: visitaObs.trim() || null,
      })
      .select("id, agente_id, agente_nombre, fecha_visita, observaciones, created_at")
      .single();

    if (error) {
      setVisitaError(error.message);
    } else if (data) {
      setVisitas((prev) => [data as VisitaEntry, ...prev]);
      setVisitaFecha(toDatetimeLocal(new Date()));
      setVisitaAgenteId(String(currentUserId));
      setVisitaObs("");
    }
    setSavingVisita(false);
  }

  async function handleDeleteVisita(id: number) {
    await supabase.from("encargo_visitas").delete().eq("id", id);
    setVisitas((prev) => prev.filter((v) => v.id !== id));
  }

  async function handleDeleteArchivo(archivo: ArchivoEntry) {
    if (archivo.storage_path) {
      await supabase.storage.from(BUCKET).remove([archivo.storage_path]);
    }
    await supabase.from("archivos").delete().eq("id", archivo.id);
    setArchivos((prev) => prev.filter((a) => a.id !== archivo.id));
  }

  async function handleAddNota() {
    if (!notaTexto.trim()) return;
    setSavingNota(true);
    setNotaError(null);
    const { data, error } = await supabase
      .from("encargo_notas")
      .insert({ contenido: notaTexto.trim(), propiedad_id: propiedad.id })
      .select("id, contenido, created_at")
      .single();
    if (error) {
      setNotaError(error.message);
    } else if (data) {
      setNotas((prev) => [data as NotaEntry, ...prev]);
      setNotaTexto("");
    }
    setSavingNota(false);
  }

  async function handleDeleteNota(id: number) {
    await supabase.from("encargo_notas").delete().eq("id", id);
    setNotas((prev) => prev.filter((n) => n.id !== id));
  }

  const documentos = archivos.filter((a) => a.tipo === "documento");
  const imagenes = archivos.filter((a) => a.tipo === "imagen");

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "visitas", label: "Visitas", icon: CalendarCheck, count: visitas.length },
    { key: "documentos", label: "Documentos", icon: FileText, count: documentos.length },
    { key: "imagenes", label: "Imagenes", icon: ImageIcon, count: imagenes.length },
    { key: "notas", label: "Notas", icon: StickyNote, count: notas.length },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/8"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col bg-surface shadow-2xl sm:w-[520px]">
        {/* ── Header ── */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {/* Avatar con iniciales */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/12 text-sm font-bold text-success">
                {propLabel(propiedad).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                {/* Badge de estado */}
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">
                    Encargo
                  </span>
                  {propiedad.estado && propiedad.estado !== "encargo" && (
                    <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-text-secondary capitalize">
                      {propiedad.estado}
                    </span>
                  )}
                </div>
                <h2 className="truncate text-base font-semibold text-text-primary leading-tight">
                  {propLabel(propiedad)}
                </h2>
                {propiedad.telefono && (
                  <p className="mt-0.5 text-sm text-text-secondary">{propiedad.telefono}</p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={onEdit}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
              >
                Editar
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                aria-label="Cerrar panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex shrink-0 overflow-x-auto border-b border-border bg-surface">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-raised",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive ? "bg-primary/10 text-primary" : "bg-surface-raised text-text-secondary",
                  ].join(" ")}>
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
              {/* ── VISITAS ── */}
              {activeTab === "visitas" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Registrar visita
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-secondary">Fecha y hora</label>
                        <input
                          type="datetime-local"
                          value={visitaFecha}
                          onChange={(e) => setVisitaFecha(e.target.value)}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-secondary">Agente</label>
                        <select
                          value={visitaAgenteId}
                          onChange={(e) => setVisitaAgenteId(e.target.value)}
                          className="input text-sm"
                        >
                          {agentes.map((a) => (
                            <option key={a.id} value={String(a.id)}>
                              {a.nombre} {a.apellidos}{a.id === currentUserId ? " (yo)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-secondary">Observaciones</label>
                        <textarea
                          value={visitaObs}
                          onChange={(e) => setVisitaObs(e.target.value)}
                          placeholder="Estado del piso, comentarios del propietario..."
                          rows={3}
                          className="input resize-none text-sm"
                        />
                      </div>
                      {visitaError && (
                        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{visitaError}</p>
                      )}
                      <button
                        onClick={handleAddVisita}
                        disabled={savingVisita}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        {savingVisita ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        {savingVisita ? "Guardando..." : "Registrar visita"}
                      </button>
                    </div>
                  </div>

                  {visitas.length === 0 ? (
                    <EmptyState icon={CalendarCheck} text="No hay visitas registradas todavia" />
                  ) : (
                    <ul className="space-y-3">
                      {visitas.map((visita) => (
                        <li key={visita.id} className="group relative rounded-xl border border-border bg-background px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <span className="text-sm font-semibold text-text-primary">
                                {formatDateTime(visita.fecha_visita)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteVisita(visita.id)}
                              className="shrink-0 rounded p-1 text-text-secondary opacity-0 transition-all group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                              title="Eliminar visita"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span>{visita.agente_nombre}</span>
                          </div>
                          {visita.observaciones && (
                            <p className="mt-2 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                              {visita.observaciones}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── DOCUMENTOS ── */}
              {activeTab === "documentos" && (
                <div className="space-y-4">
                  {/* Drop zone */}
                  <DropZone
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
                    multiple
                    onFiles={addDocFiles}
                  >
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <UploadCloud className="h-8 w-8 text-text-secondary/50" />
                      <p className="text-sm font-medium text-text-secondary">
                        Arrastra documentos aqui o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-text-secondary/60">PDF, Word, Excel, PowerPoint…</p>
                    </div>
                  </DropZone>

                  {/* Cola de subida */}
                  {docQueue.length > 0 && (
                    <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Listos para subir ({docQueue.length})
                      </p>
                      {docQueue.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                          <input
                            type="text"
                            value={item.nombre}
                            onChange={(e) => updateDocNombre(idx, e.target.value)}
                            disabled={item.status === "uploading" || item.status === "done"}
                            className="input flex-1 py-1 text-xs"
                          />
                          <StatusBadge status={item.status} />
                          {item.status === "pending" && (
                            <button
                              onClick={() => removeDocFromQueue(idx)}
                              className="rounded p-1 text-text-secondary hover:text-danger"
                              title="Quitar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleUploadDocs}
                        disabled={uploadingDocs || docQueue.every((x) => x.status === "done")}
                        className="mt-1 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        {uploadingDocs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                        {uploadingDocs ? "Subiendo..." : `Subir ${docQueue.filter((x) => x.status === "pending").length} documento${docQueue.filter((x) => x.status === "pending").length !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  )}

                  {/* Lista documentos subidos */}
                  {documentos.length === 0 && docQueue.length === 0 ? (
                    <EmptyState icon={FileText} text="No hay documentos todavia" />
                  ) : documentos.length > 0 ? (
                    <ul className="space-y-2">
                      {documentos.map((doc) => (
                        <li key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                          <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">{doc.nombre}</p>
                            <p className="text-xs text-text-secondary">{formatDateTime(doc.created_at)}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {doc.url && (
                              <>
                                <button
                                  onClick={() => downloadFile(doc.url!, doc.nombre)}
                                  className="rounded p-1 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                                  title="Descargar"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded p-1 text-text-secondary transition-colors hover:bg-blue-50 hover:text-blue-600"
                                  title="Abrir"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteArchivo(doc)}
                              className="rounded p-1 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}

              {/* ── IMÁGENES ── */}
              {activeTab === "imagenes" && (
                <div className="space-y-4">
                  {/* Drop zone */}
                  <DropZone accept="image/*" multiple onFiles={addImgFiles}>
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <UploadCloud className="h-8 w-8 text-text-secondary/50" />
                      <p className="text-sm font-medium text-text-secondary">
                        Arrastra imagenes aqui o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-text-secondary/60">JPG, PNG, WEBP, HEIC…</p>
                    </div>
                  </DropZone>

                  {/* Previews cola */}
                  {imgQueue.length > 0 && (
                    <div className="rounded-xl border border-border bg-background p-3 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Listas para subir ({imgQueue.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {imgQueue.map((item, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={URL.createObjectURL(item.file)}
                              alt={item.nombre}
                              className="h-20 w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              {item.status === "uploading" && (
                                <div className="rounded-full bg-black/50 p-1.5">
                                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                                </div>
                              )}
                              {item.status === "done" && (
                                <div className="rounded-full bg-success/80 p-1.5">
                                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              {item.status === "error" && (
                                <div className="rounded-full bg-danger/80 p-1.5">
                                  <X className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                            {item.status === "pending" && (
                              <button
                                onClick={() => removeImgFromQueue(idx)}
                                className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-danger/80"
                                title="Quitar"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            <div className="px-1.5 py-1 bg-surface/90">
                              <p className="truncate text-xs text-text-secondary">{item.nombre}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleUploadImgs}
                        disabled={uploadingImgs || imgQueue.every((x) => x.status === "done")}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                      >
                        {uploadingImgs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                        {uploadingImgs ? "Subiendo..." : `Subir ${imgQueue.filter((x) => x.status === "pending").length} imagen${imgQueue.filter((x) => x.status === "pending").length !== 1 ? "es" : ""}`}
                      </button>
                    </div>
                  )}

                  {/* Galería subida */}
                  {imagenes.length === 0 && imgQueue.length === 0 ? (
                    <EmptyState icon={ImageIcon} text="No hay imagenes todavia" />
                  ) : imagenes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {imagenes.map((img) => (
                        <div key={img.id} className="group relative overflow-hidden rounded-xl border border-border bg-background">
                          {img.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img.url}
                              alt={img.nombre}
                              className="h-36 w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="flex h-36 items-center justify-center bg-background">
                              <ImageIcon className="h-10 w-10 text-text-secondary/40" />
                            </div>
                          )}
                          <div className="px-3 py-2">
                            <p className="truncate text-xs font-medium text-text-primary">{img.nombre}</p>
                            <p className="text-xs text-text-secondary">{formatDateTime(img.created_at)}</p>
                          </div>
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {img.url && (
                              <>
                                <button
                                  onClick={() => downloadFile(img.url!, img.nombre)}
                                  className="rounded-lg bg-surface/90 p-1 shadow transition-colors hover:bg-surface"
                                  title="Descargar"
                                >
                                  <Download className="h-3.5 w-3.5 text-text-primary" />
                                </button>
                                <a
                                  href={img.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg bg-surface/90 p-1 shadow transition-colors hover:bg-surface"
                                  title="Abrir"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-text-primary" />
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteArchivo(img)}
                              className="rounded-lg bg-white/90 p-1 shadow transition-colors hover:bg-danger/10"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-danger" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── NOTAS ── */}
              {activeTab === "notas" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Nueva nota
                    </p>
                    <textarea
                      value={notaTexto}
                      onChange={(e) => setNotaTexto(e.target.value)}
                      placeholder="Escribe una nota sobre la operacion..."
                      rows={3}
                      className="input resize-none text-sm"
                    />
                    {notaError && (
                      <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{notaError}</p>
                    )}
                    <button
                      onClick={handleAddNota}
                      disabled={savingNota || !notaTexto.trim()}
                      className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                    >
                      {savingNota ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Guardar nota
                    </button>
                  </div>

                  {notas.length === 0 ? (
                    <EmptyState icon={StickyNote} text="No hay notas todavia" />
                  ) : (
                    <ul className="space-y-3">
                      {notas.map((nota) => (
                        <li key={nota.id} className="group relative rounded-xl border border-border bg-background px-4 py-3">
                          <p className="pr-8 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                            {nota.contenido}
                          </p>
                          <p className="mt-2 text-xs text-text-secondary">{formatDateTime(nota.created_at)}</p>
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

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UploadItem["status"] }) {
  if (status === "uploading") return <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />;
  if (status === "done") return (
    <svg className="h-3.5 w-3.5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
  if (status === "error") return <X className="h-3.5 w-3.5 shrink-0 text-danger" />;
  return null;
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background">
        <Icon className="h-6 w-6 text-text-secondary/50" />
      </div>
      <p className="text-sm text-text-secondary">{text}</p>
    </div>
  );
}
