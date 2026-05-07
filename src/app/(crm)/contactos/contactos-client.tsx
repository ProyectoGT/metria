"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Archive, Download, Mail, Pencil, Phone, Plus, RotateCcw, Search,
  History, SlidersHorizontal, Upload, User, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useToast, Toaster } from "@/components/ui/toast";
import ContactoTimeline, { type TimelineEvent } from "@/components/timeline/ContactoTimeline";
import RelatedEmailsPanel from "@/components/email/RelatedEmailsPanel";
import Drawer from "@/components/ui/drawer";
import type { Contacto, ContactoTipo, ContactoEstado } from "@/types";
import type { UserRole } from "@/lib/roles";

// ─── Constantes ───────────────────────────────────────────────────────────────

export const TIPOS: { value: ContactoTipo; label: string; badge: string }[] = [
  { value: "cliente",              label: "Cliente",          badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { value: "propietario",          label: "Propietario",      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { value: "comprador",            label: "Comprador",        badge: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  { value: "inquilino",            label: "Inquilino",        badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" },
  { value: "colaborador",          label: "Colaborador",      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "proveedor",            label: "Proveedor",        badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { value: "abogado",              label: "Abogado",          badge: "bg-red-500/15 text-red-700 dark:text-red-400" },
  { value: "notario",              label: "Notario",          badge: "bg-rose-500/15 text-rose-700 dark:text-rose-400" },
  { value: "banco",                label: "Banco",            badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400" },
  { value: "administrador_fincas", label: "Admin. Fincas",    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-400" },
  { value: "reformista",           label: "Reformista",       badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  { value: "arquitecto",           label: "Arquitecto",       badge: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  { value: "otro",                 label: "Otro",             badge: "bg-gray-500/15 text-gray-600 dark:text-gray-400" },
];

const ESTADOS: { value: ContactoEstado; label: string; badge: string }[] = [
  { value: "activo",   label: "Activo",   badge: "bg-success/15 text-success" },
  { value: "inactivo", label: "Inactivo", badge: "bg-gray-500/15 text-gray-600 dark:text-gray-400" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tipoMeta(tipo: string) { return TIPOS.find((t) => t.value === tipo) ?? TIPOS[TIPOS.length - 1]; }
function estadoMeta(estado: string) { return ESTADOS.find((e) => e.value === estado) ?? ESTADOS[0]; }
function nombreCompleto(c: Pick<Contacto, "nombre" | "apellidos">) {
  return [c.nombre, c.apellidos].filter(Boolean).join(" ");
}
function initials(c: Pick<Contacto, "nombre" | "apellidos">) {
  const n = c.nombre?.[0] ?? "";
  const a = c.apellidos?.[0] ?? c.nombre?.[1] ?? "";
  return (n + a).toUpperCase();
}
const AVATAR_COLORS = [
  "bg-blue-500","bg-emerald-500","bg-violet-500","bg-amber-500","bg-rose-500",
  "bg-cyan-500","bg-indigo-500","bg-orange-500","bg-teal-500","bg-purple-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "nombre","apellidos","empresa","cargo","tipo","email",
  "telefono","telefono_secundario","ciudad","provincia","notas","origen","estado",
];

const CSV_HEADER_LABELS: Record<string, string> = {
  nombre: "Nombre", apellidos: "Apellidos", empresa: "Empresa", cargo: "Cargo",
  tipo: "Tipo", email: "Email", telefono: "Telefono",
  telefono_secundario: "Telefono 2", ciudad: "Ciudad", provincia: "Provincia",
  notas: "Notas", origen: "Origen", estado: "Estado",
};

function contactosToCSV(rows: Contacto[]): string {
  const escape = (v: string | null | undefined) => {
    const s = (v ?? "").replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };
  const header = CSV_HEADERS.map((h) => CSV_HEADER_LABELS[h]).join(",");
  const body = rows.map((c) =>
    CSV_HEADERS.map((h) => escape((c as unknown as Record<string, string | null | undefined>)[h])).join(",")
  );
  return [header, ...body].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

type ParsedCSVRow = Record<string, string>;

function parseCSV(text: string): { headers: string[]; rows: ParsedCSVRow[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    fields.push(cur.trim());
    return fields;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_").replace(/[áàä]/g,"a").replace(/[éèë]/g,"e").replace(/[íìï]/g,"i").replace(/[óòö]/g,"o").replace(/[úùü]/g,"u").replace(/ñ/g,"n"));
  const rows: ParsedCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    if (vals.every((v) => !v)) continue;
    const row: ParsedCSVRow = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}

const TIPO_VALUES = new Set(TIPOS.map((t) => t.value));
const VALID_TIPOS: ContactoTipo[] = TIPOS.map((t) => t.value);

function normalizeTipo(raw: string): ContactoTipo {
  const v = raw.toLowerCase().trim();
  if (TIPO_VALUES.has(v as ContactoTipo)) return v as ContactoTipo;
  // fuzzy
  if (v.includes("client")) return "cliente";
  if (v.includes("propiet") || v.includes("owner")) return "propietario";
  if (v.includes("compra")) return "comprador";
  if (v.includes("inqui") || v.includes("arrendat")) return "inquilino";
  if (v.includes("abog") || v.includes("lawyer")) return "abogado";
  if (v.includes("notar")) return "notario";
  if (v.includes("banco") || v.includes("financ")) return "banco";
  if (v.includes("reform") || v.includes("construc")) return "reformista";
  if (v.includes("arqui")) return "arquitecto";
  if (v.includes("admin")) return "administrador_fincas";
  if (v.includes("proveedor") || v.includes("supplier")) return "proveedor";
  if (v.includes("colabor")) return "colaborador";
  return "otro";
}

function rowToInsert(row: ParsedCSVRow): ContactoFormPayload | null {
  if (!row.nombre?.trim()) return null;
  return {
    nombre: row.nombre.trim(),
    apellidos: row.apellidos?.trim() || null,
    empresa: row.empresa?.trim() || null,
    cargo: row.cargo?.trim() || null,
    tipo: normalizeTipo(row.tipo ?? ""),
    email: row.email?.trim() || null,
    telefono: row.telefono?.trim() || null,
    telefono_secundario: row.telefono_secundario?.trim() || null,
    ciudad: row.ciudad?.trim() || null,
    provincia: row.provincia?.trim() || null,
    direccion: null,
    codigo_postal: null,
    pais: "España",
    notas: row.notas?.trim() || null,
    origen: row.origen?.trim() || null,
    estado: (row.estado?.trim().toLowerCase() === "inactivo" ? "inactivo" : "activo") as ContactoEstado,
    visibility: "company",
  };
}

// ─── Tipos locales ─────────────────────────────────────────────────────────────

type ContactoFormPayload = {
  nombre: string; apellidos: string | null; empresa: string | null; cargo: string | null;
  tipo: ContactoTipo; email: string | null; telefono: string | null;
  telefono_secundario: string | null; direccion: string | null; ciudad: string | null;
  provincia: string | null; codigo_postal: string | null; pais: string;
  notas: string | null; origen: string | null; estado: ContactoEstado; visibility: string;
};

type ContactoForm = {
  nombre: string; apellidos: string; empresa: string; cargo: string;
  tipo: ContactoTipo; email: string; telefono: string; telefono_secundario: string;
  direccion: string; ciudad: string; provincia: string; codigo_postal: string; pais: string;
  notas: string; origen: string; estado: ContactoEstado; visibility: string;
};

function emptyForm(): ContactoForm {
  return {
    nombre: "", apellidos: "", empresa: "", cargo: "", tipo: "otro",
    email: "", telefono: "", telefono_secundario: "",
    direccion: "", ciudad: "", provincia: "", codigo_postal: "", pais: "España",
    notas: "", origen: "", estado: "activo", visibility: "company",
  };
}

function validateEmail(email: string) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  initialContactos: Contacto[];
  currentUserId: number;
  currentUserRole: UserRole | string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContactosClient({ initialContactos, currentUserId, currentUserRole }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = useMemo(() => createClient() as any, []);
  const { toast, toasts } = useToast();

  const [contactos, setContactos] = useState<Contacto[]>(initialContactos);
  const [search, setSearch]             = useState("");
  const [filterTipo, setFilterTipo]     = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<string>("activo");
  const [showFilters, setShowFilters]   = useState(false);

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState<ContactoForm>(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [timelineContacto, setTimelineContacto] = useState<Contacto | null>(null);

  // Archive / restore
  const [archivingId, setArchivingId]   = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived]         = useState<Contacto[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [restoringId, setRestoringId]   = useState<number | null>(null);

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal]   = useState(false);
  const [importRows, setImportRows]     = useState<ContactoFormPayload[]>([]);
  const [importing, setImporting]       = useState(false);
  const [importError, setImportError]   = useState<string | null>(null);

  const canManageAll = currentUserRole === "Administrador" || currentUserRole === "Director";

  // ─── Filtrado ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return contactos.filter((c) => {
      if (filterTipo && c.tipo !== filterTipo) return false;
      if (filterEstado && c.estado !== filterEstado) return false;
      if (!q) return true;
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.apellidos ?? "").toLowerCase().includes(q) ||
        (c.empresa ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.telefono ?? "").includes(q) ||
        (c.notas ?? "").toLowerCase().includes(q)
      );
    });
  }, [contactos, search, filterTipo, filterEstado]);

  // ─── Modal create/edit ───────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null); setForm(emptyForm()); setSaveError(null); setModalOpen(true);
  }
  function openEdit(c: Contacto) {
    setEditId(c.id);
    setForm({
      nombre: c.nombre, apellidos: c.apellidos ?? "", empresa: c.empresa ?? "",
      cargo: c.cargo ?? "", tipo: c.tipo, email: c.email ?? "",
      telefono: c.telefono ?? "", telefono_secundario: c.telefono_secundario ?? "",
      direccion: c.direccion ?? "", ciudad: c.ciudad ?? "", provincia: c.provincia ?? "",
      codigo_postal: c.codigo_postal ?? "", pais: c.pais ?? "España",
      notas: c.notas ?? "", origen: c.origen ?? "", estado: c.estado,
      visibility: c.visibility ?? "company",
    });
    setSaveError(null); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditId(null); setSaveError(null); }
  function setField<K extends keyof ContactoForm>(key: K, value: ContactoForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setSaveError("El nombre es obligatorio"); return; }
    if (!validateEmail(form.email)) { setSaveError("El formato del email no es valido"); return; }
    setSaving(true); setSaveError(null);

    const payload: ContactoFormPayload = {
      nombre: form.nombre.trim(), apellidos: form.apellidos.trim() || null,
      empresa: form.empresa.trim() || null, cargo: form.cargo.trim() || null,
      tipo: form.tipo, email: form.email.trim() || null,
      telefono: form.telefono.trim() || null, telefono_secundario: form.telefono_secundario.trim() || null,
      direccion: form.direccion.trim() || null, ciudad: form.ciudad.trim() || null,
      provincia: form.provincia.trim() || null, codigo_postal: form.codigo_postal.trim() || null,
      pais: form.pais.trim() || "España", notas: form.notas.trim() || null,
      origen: form.origen.trim() || null, estado: form.estado, visibility: form.visibility,
    };

    if (editId !== null) {
      const { data, error } = await db.from("contactos").update(payload).eq("id", editId).select().single();
      setSaving(false);
      if (error) { setSaveError(error.message); return; }
      setContactos((prev) => prev.map((c) => c.id === editId ? (data as Contacto) : c));
      toast("Contacto actualizado"); closeModal();
    } else {
      const { data, error } = await db.from("contactos").insert(payload).select().single();
      setSaving(false);
      if (error) { setSaveError(error.message); return; }
      setContactos((prev) => [data as Contacto, ...prev]);
      toast("Contacto creado"); closeModal();
    }
  }

  // ─── Archivar / Restaurar ────────────────────────────────────────────────────

  function contactoTimelineEvents(c: Contacto): TimelineEvent[] {
    const details = [
      c.tipo && `Tipo: ${tipoMeta(c.tipo).label}`,
      c.telefono && `Telefono: ${c.telefono}`,
      c.email && `Email: ${c.email}`,
      c.origen && `Origen: ${c.origen}`,
    ].filter(Boolean);

    return [{
      id: `contacto-${c.id}`,
      contacto_id: c.id,
      tipo_evento: "contacto",
      titulo: "Contacto registrado",
      descripcion: details.join("\n") || null,
      created_at: c.created_at,
      synthetic: true,
    }];
  }

  async function handleArchive(id: number) {
    if (archivingId === id) return;
    setArchivingId(id);
    const { error } = await db.from("contactos").update({ archived_at: new Date().toISOString() }).eq("id", id);
    setArchivingId(null);
    if (error) { toast(error.message, "error"); return; }
    setContactos((prev) => prev.filter((c) => c.id !== id));
    toast("Contacto archivado");
  }

  const fetchArchived = useCallback(async () => {
    setLoadingArchived(true);
    const { data, error } = await db
      .from("contactos")
      .select("id,nombre,apellidos,empresa,cargo,tipo,email,telefono,telefono_secundario,direccion,ciudad,provincia,codigo_postal,pais,notas,origen,estado,owner_user_id,empresa_id,equipo_id,visibility,created_at,updated_at,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(100);
    setLoadingArchived(false);
    if (error) { toast(error.message, "error"); return; }
    setArchived((data ?? []) as Contacto[]);
  }, [db, toast]);

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next && archived.length === 0) await fetchArchived();
  }

  async function handleRestore(id: number) {
    if (restoringId === id) return;
    setRestoringId(id);
    const { data, error } = await db.from("contactos").update({ archived_at: null }).eq("id", id).select().single();
    setRestoringId(null);
    if (error) { toast(error.message, "error"); return; }
    setArchived((prev) => prev.filter((c) => c.id !== id));
    setContactos((prev) => [data as Contacto, ...prev]);
    toast("Contacto restaurado");
  }

  // ─── Exportar CSV ────────────────────────────────────────────────────────────

  function handleExport() {
    if (filtered.length === 0) { toast("No hay contactos para exportar", "error"); return; }
    const csv = contactosToCSV(filtered);
    const fecha = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `contactos_${fecha}.csv`);
    toast(`${filtered.length} contactos exportados`);
  }

  function handleExportTemplate() {
    const header = CSV_HEADERS.map((h) => CSV_HEADER_LABELS[h]).join(",");
    const example = [
      "Juan", "Garcia Lopez", "Inmobiliaria ABC", "Director",
      "cliente", "juan@ejemplo.com", "600000001", "",
      "Madrid", "Madrid", "Cliente habitual", "Web", "activo",
    ].join(",");
    const tiposStr = VALID_TIPOS.join(" | ");
    const comment = `# Tipos validos: ${tiposStr}`;
    downloadCSV([comment, header, example].join("\n"), "plantilla_contactos.csv");
  }

  // ─── Importar CSV ────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast("Solo se aceptan archivos .csv", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows } = parseCSV(text);
      const parsed = rows.map(rowToInsert).filter((r): r is ContactoFormPayload => r !== null);
      if (parsed.length === 0) {
        toast("No se encontraron filas validas. Comprueba que el CSV tiene una columna 'nombre'.", "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setImportRows(parsed);
      setImportError(null);
      setImportModal(true);
    };
    reader.readAsText(file, "UTF-8");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    if (importing || importRows.length === 0) return;
    setImporting(true); setImportError(null);

    // Batch por lotes de 50
    const BATCH = 50;
    const inserted: Contacto[] = [];
    for (let i = 0; i < importRows.length; i += BATCH) {
      const chunk = importRows.slice(i, i + BATCH);
      const { data, error } = await db.from("contactos").insert(chunk).select();
      if (error) { setImportError(error.message); setImporting(false); return; }
      inserted.push(...((data ?? []) as Contacto[]));
    }

    setContactos((prev) => [...inserted, ...prev]);
    setImporting(false);
    setImportModal(false);
    setImportRows([]);
    toast(`${inserted.length} contactos importados`);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Toaster toasts={toasts} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
      />

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            placeholder="Buscar por nombre, empresa, telefono, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9 text-sm"
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || filterTipo || filterEstado !== "activo"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-text-secondary hover:bg-background"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {(filterTipo || filterEstado !== "activo") && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
              {(filterTipo ? 1 : 0) + (filterEstado !== "activo" ? 1 : 0)}
            </span>
          )}
        </button>

        <button
          onClick={handleExport}
          title="Exportar contactos filtrados a CSV"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Importar contactos desde CSV"
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Importar</span>
        </button>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Nuevo contacto
        </button>
      </div>

      {/* ── Filtros ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">Tipo</label>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="input h-8 py-0 text-xs">
              <option value="">Todos los tipos</option>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">Estado</label>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="input h-8 py-0 text-xs">
              <option value="">Todos</option>
              {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          {(filterTipo || filterEstado !== "activo") && (
            <button
              onClick={() => { setFilterTipo(""); setFilterEstado("activo"); }}
              className="mt-auto flex items-center gap-1 text-xs text-text-secondary hover:text-danger"
            >
              <X className="h-3.5 w-3.5" /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── Tabla principal ── */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <User className="mb-3 h-10 w-10 text-text-secondary/30" />
            <p className="text-sm font-medium text-text-primary">
              {contactos.length === 0 ? "No hay contactos todavia" : "No se encontraron contactos"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {contactos.length === 0
                ? "Crea tu primer contacto o importa un CSV."
                : "Prueba con otros terminos de busqueda o cambia los filtros."}
            </p>
            {contactos.length === 0 && (
              <button onClick={openCreate} className="mt-4 text-xs font-medium text-primary hover:underline">
                + Crear contacto
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background text-left text-xs font-medium text-text-secondary">
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="hidden px-4 py-3 md:table-cell">Empresa</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Telefono</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Email</th>
                    <th className="hidden px-4 py-3 xl:table-cell">Ciudad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const t = tipoMeta(c.tipo);
                    const e = estadoMeta(c.estado);
                    const nombre = nombreCompleto(c);
                    return (
                      <tr key={c.id} onClick={() => openEdit(c)} className="cursor-pointer hover:bg-background">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(nombre)}`}>
                              {initials(c)}
                            </span>
                            <span className="font-medium text-text-primary">{nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.badge}`}>{t.label}</span>
                        </td>
                        <td className="hidden px-4 py-3 text-text-secondary md:table-cell">{c.empresa ?? "—"}</td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {c.telefono ? (
                            <a href={`tel:${c.telefono}`} onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1 text-text-secondary hover:text-primary">
                              <Phone className="h-3.5 w-3.5" />{c.telefono}
                            </a>
                          ) : <span className="text-text-secondary">—</span>}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {c.email ? (
                            <a href={`mailto:${c.email}`} onClick={(ev) => ev.stopPropagation()} className="flex max-w-[180px] items-center gap-1 truncate text-text-secondary hover:text-primary">
                              <Mail className="h-3.5 w-3.5 shrink-0" />{c.email}
                            </a>
                          ) : <span className="text-text-secondary">—</span>}
                        </td>
                        <td className="hidden px-4 py-3 text-text-secondary xl:table-cell">
                          {[c.ciudad, c.provincia].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.badge}`}>{e.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={(ev) => { ev.stopPropagation(); openEdit(c); }} className="rounded p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={(ev) => { ev.stopPropagation(); setTimelineContacto(c); }} className="rounded p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary" title="Timeline">
                              <History className="h-3.5 w-3.5" />
                            </button>
                            {(canManageAll || c.owner_user_id === currentUserId) && (
                              <button onClick={(ev) => { ev.stopPropagation(); handleArchive(c.id); }} disabled={archivingId === c.id} className="rounded p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50" title="Archivar">
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <span className="text-xs text-text-secondary">
                {filtered.length} {filtered.length === 1 ? "contacto" : "contactos"}{filtered.length !== contactos.length && ` de ${contactos.length}`}
              </span>
              <button onClick={toggleArchived} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showArchived ? "text-primary" : "text-text-secondary hover:text-text-primary"}`}>
                <Archive className="h-3.5 w-3.5" />
                {showArchived ? "Ocultar archivados" : "Ver archivados"}
                {archived.length > 0 && <span className="rounded-full bg-border px-1.5 py-0.5 text-[10px]">{archived.length}</span>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Archivados ── */}
      {showArchived && (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Archive className="h-4 w-4 text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Archivados</h3>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-text-secondary">{archived.length}</span>
          </div>

          {loadingArchived ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : archived.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">No hay contactos archivados</p>
          ) : (
            <div className="divide-y divide-border">
              {archived.map((c) => {
                const t = tipoMeta(c.tipo);
                const nombre = nombreCompleto(c);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 opacity-70">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(nombre)}`}>
                      {initials(c)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary line-through">{nombre}</p>
                      <p className="text-xs text-text-secondary">{c.empresa ?? t.label}</p>
                    </div>
                    <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${t.badge}`}>{t.label}</span>
                    <button
                      onClick={() => handleRestore(c.id)}
                      disabled={restoringId === c.id}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-primary disabled:opacity-50"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {restoringId === c.id ? "Restaurando..." : "Restaurar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Drawer crear/editar ── */}
      <Drawer
        open={modalOpen}
        onClose={closeModal}
        title={
          editId !== null
            ? (() => { const c = contactos.find((x) => x.id === editId); return c ? nombreCompleto(c) : "Editar contacto"; })()
            : "Nuevo contacto"
        }
        subtitle={
          editId !== null
            ? (() => {
                const c = contactos.find((cc) => cc.id === editId);
                if (!c) return undefined;
                return [c.empresa, c.cargo].filter(Boolean).join(" · ") || undefined;
              })()
            : undefined
        }
        width="xl"
        headerActions={
          editId !== null
            ? (() => {
                const c = contactos.find((cc) => cc.id === editId);
                if (!c) return null;
                return (
                  <button
                    type="button"
                    onClick={() => setTimelineContacto(c)}
                    className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-primary"
                    title="Timeline"
                  >
                    <History className="h-4 w-4" />
                  </button>
                );
              })()
            : undefined
        }
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="contact-form"
              disabled={saving || !form.nombre.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear contacto"}
            </button>
          </div>
        }
      >
        {editId !== null &&
          (() => {
            const c = contactos.find((cc) => cc.id === editId);
            if (!c) return null;
            const t = tipoMeta(c.tipo);
            const n = nombreCompleto(c);
            return (
              <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-background/50">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatarColor(n)}`}>
                  {initials(c)}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.badge}`}>{t.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${estadoMeta(c.estado).badge}`}>
                    {estadoMeta(c.estado).label}
                  </span>
                </div>
              </div>
            );
          })()}

        <form id="contact-form" onSubmit={handleSave} className="flex flex-1 flex-col">
          <div className="space-y-5 px-6 py-5">
            {/* Datos básicos */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Datos basicos</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Nombre <span className="text-danger">*</span></label>
                  <input value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} className="input" required autoFocus placeholder="Nombre" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Apellidos</label>
                  <input value={form.apellidos} onChange={(e) => setField("apellidos", e.target.value)} className="input" placeholder="Apellidos" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Tipo <span className="text-danger">*</span></label>
                  <select value={form.tipo} onChange={(e) => setField("tipo", e.target.value as ContactoTipo)} className="input" required>
                    {TIPOS.map((t_) => <option key={t_.value} value={t_.value}>{t_.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Estado</label>
                  <select value={form.estado} onChange={(e) => setField("estado", e.target.value as ContactoEstado)} className="input">
                    {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Empresa</label>
                  <input value={form.empresa} onChange={(e) => setField("empresa", e.target.value)} className="input" placeholder="Nombre de la empresa" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Cargo</label>
                  <input value={form.cargo} onChange={(e) => setField("cargo", e.target.value)} className="input" placeholder="Cargo o puesto" />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Informacion de contacto</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="input" placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Telefono</label>
                  <input type="tel" value={form.telefono} onChange={(e) => setField("telefono", e.target.value)} className="input" placeholder="600 000 000" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Telefono secundario</label>
                <input type="tel" value={form.telefono_secundario} onChange={(e) => setField("telefono_secundario", e.target.value)} className="input" placeholder="Segundo numero opcional" />
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Ubicacion</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Ciudad</label>
                  <input value={form.ciudad} onChange={(e) => setField("ciudad", e.target.value)} className="input" placeholder="Ciudad" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">Provincia</label>
                  <input value={form.provincia} onChange={(e) => setField("provincia", e.target.value)} className="input" placeholder="Provincia" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Direccion</label>
                <input value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} className="input" placeholder="Calle, numero, piso..." />
              </div>
            </div>

            {/* Otros */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Otros datos</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Origen</label>
                <input value={form.origen} onChange={(e) => setField("origen", e.target.value)} className="input" placeholder="Como ha llegado este contacto" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Notas</label>
                <textarea value={form.notas} onChange={(e) => setField("notas", e.target.value)} rows={3} className="input resize-none" placeholder="Notas adicionales..." />
              </div>
            </div>

            {saveError && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{saveError}</p>}
          </div>
        </form>
      </Drawer>

      {/* ── Drawer importar CSV ── */}
      <Drawer
        open={importModal}
        onClose={() => { setImportModal(false); setImportRows([]); }}
        title="Importar contactos"
        subtitle={`${importRows.length} ${importRows.length === 1 ? "fila valida" : "filas validas"} encontradas`}
        width="xl"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background text-left text-text-secondary">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Apellidos</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Telefono</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Ciudad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {importRows.slice(0, 50).map((row, i) => {
                  const t = tipoMeta(row.tipo);
                  return (
                    <tr key={i} className="hover:bg-background">
                      <td className="px-3 py-2 font-medium">{row.nombre}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.apellidos ?? "—"}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${t.badge}`}>{t.label}</span></td>
                      <td className="px-3 py-2 text-text-secondary">{row.empresa ?? "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.telefono ?? "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.email ?? "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.ciudad ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {importRows.length > 50 && (
              <p className="mt-2 text-center text-xs text-text-secondary">... y {importRows.length - 50} filas mas</p>
            )}
          </div>

          {importError && <p className="mx-4 mb-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{importError}</p>}

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            <button onClick={handleExportTemplate} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary">
              <Download className="h-3.5 w-3.5" /> Descargar plantilla CSV
            </button>
            <div className="flex gap-3">
              <button onClick={() => { setImportModal(false); setImportRows([]); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
              <button onClick={handleImport} disabled={importing} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
                {importing ? "Importando..." : `Importar ${importRows.length} contactos`}
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      {timelineContacto && (
        <Drawer
          open={!!timelineContacto}
          onClose={() => setTimelineContacto(null)}
          title={nombreCompleto(timelineContacto)}
          subtitle="Timeline del contacto"
          width="xl"
          zIndex="z-[50]"
        >
          <>
              <ContactoTimeline
                subject={{ type: "contacto", id: timelineContacto.id, title: nombreCompleto(timelineContacto) }}
                currentUserId={currentUserId}
                initialEvents={contactoTimelineEvents(timelineContacto)}
              />
              <RelatedEmailsPanel
                entityType="contacto"
                entityId={timelineContacto.id}
                replyTo={timelineContacto.email}
              />
          </>
        </Drawer>
      )}
    </div>
  );
}
