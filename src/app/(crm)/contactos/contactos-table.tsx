"use client";

/**
 * Tabla virtualizada de contactos.
 *
 * Patrón de virtualización para <table>:
 *   - Contenedor scrollable con altura fija cuando hay muchas filas.
 *   - Dos <tr> de padding (top y bottom) que reservan el espacio de las
 *     filas no renderizadas, manteniendo la alineación de columnas.
 *   - Solo se renderizan las filas visibles + overscan.
 *
 * ROW_H debe coincidir con el padding real de cada fila (py-3 ≈ 56 px).
 */

import { memo, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Archive, History, Mail, Pencil, Phone } from "lucide-react";
import type { Contacto } from "@/types";
import { TIPOS, ESTADOS } from "./contactos-client";

// ─── Helpers (module-level) ───────────────────────────────────────────────────

function tipoMeta(tipo: string)     { return TIPOS.find((t) => t.value === tipo) ?? TIPOS[TIPOS.length - 1]; }
function estadoMeta(estado: string) { return ESTADOS.find((e) => e.value === estado) ?? ESTADOS[0]; }

function nombreCompleto(c: Pick<Contacto, "nombre" | "apellidos">) {
  return [c.nombre, c.apellidos].filter(Boolean).join(" ");
}
function initials(c: Pick<Contacto, "nombre" | "apellidos">) {
  return ((c.nombre?.[0] ?? "") + (c.apellidos?.[0] ?? c.nombre?.[1] ?? "")).toUpperCase();
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

// ─── Memoized row ─────────────────────────────────────────────────────────────

interface RowProps {
  contact:     Contacto;
  canDelete:   boolean;
  archivingId: number | null;
  onEdit:      (c: Contacto) => void;
  onArchive:   (id: number) => void;
  onTimeline:  (c: Contacto) => void;
}

const ContactoRow = memo(function ContactoRow({
  contact: c, canDelete, archivingId, onEdit, onArchive, onTimeline,
}: RowProps) {
  const t      = tipoMeta(c.tipo);
  const e      = estadoMeta(c.estado);
  const nombre = nombreCompleto(c);

  const handleRowClick = useCallback(() => onEdit(c), [c, onEdit]);
  const handleEdit     = useCallback((ev: React.MouseEvent) => { ev.stopPropagation(); onEdit(c); }, [c, onEdit]);
  const handleTimeline = useCallback((ev: React.MouseEvent) => { ev.stopPropagation(); onTimeline(c); }, [c, onTimeline]);
  const handleArchive  = useCallback((ev: React.MouseEvent) => { ev.stopPropagation(); onArchive(c.id); }, [c.id, onArchive]);

  return (
    <tr onClick={handleRowClick} className="cursor-pointer border-b border-border hover:bg-background">
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
        {c.telefono
          ? <a href={`tel:${c.telefono}`} onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1 text-text-secondary hover:text-primary"><Phone className="h-3.5 w-3.5" />{c.telefono}</a>
          : <span className="text-text-secondary">—</span>}
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        {c.email
          ? <a href={`mailto:${c.email}`} onClick={(ev) => ev.stopPropagation()} className="flex max-w-[180px] items-center gap-1 truncate text-text-secondary hover:text-primary"><Mail className="h-3.5 w-3.5 shrink-0" />{c.email}</a>
          : <span className="text-text-secondary">—</span>}
      </td>
      <td className="hidden px-4 py-3 text-text-secondary xl:table-cell">
        {[c.ciudad, c.provincia].filter(Boolean).join(", ") || "—"}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.badge}`}>{e.label}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={handleEdit}     className="rounded p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={handleTimeline} className="rounded p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary" title="Timeline"><History className="h-3.5 w-3.5" /></button>
          {canDelete && (
            <button onClick={handleArchive} disabled={archivingId === c.id} className="rounded p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50" title="Archivar">
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

// ─── Virtualized table ────────────────────────────────────────────────────────

const ROW_H       = 56;   // py-3 (24px padding) + ~32px content
const TABLE_MAX_H = 640;  // scroll kicks in above this height

interface ContactosTableProps {
  contacts:      Contacto[];
  currentUserId: number | null;
  canManageAll:  boolean;
  archivingId:   number | null;
  onEdit:        (c: Contacto) => void;
  onArchive:     (id: number) => void;
  onTimeline:    (c: Contacto) => void;
}

export const ContactosTable = memo(function ContactosTable({
  contacts, currentUserId, canManageAll, archivingId, onEdit, onArchive, onTimeline,
}: ContactosTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count:            contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize:     () => ROW_H,
    overscan:         8,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize    = rowVirtualizer.getTotalSize();

  // Padding spacers maintain column widths without absolute positioning
  const paddingTop    = virtualItems.length > 0 ? virtualItems[0].start                        : 0;
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const shouldVirtualize = contacts.length * ROW_H > TABLE_MAX_H;

  return (
    <div className="overflow-x-auto">
      <div
        ref={parentRef}
        style={shouldVirtualize ? { overflowY: "auto", maxHeight: TABLE_MAX_H } : undefined}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_var(--color-border)]">
            <tr className="text-left text-xs font-medium text-text-secondary">
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
          <tbody>
            {/* Top spacer — reserves height of non-rendered rows above viewport */}
            {paddingTop > 0 && <tr><td colSpan={8} style={{ height: paddingTop }} /></tr>}

            {virtualItems.map((vRow) => {
              const c = contacts[vRow.index];
              return (
                <ContactoRow
                  key={c.id}
                  contact={c}
                  canDelete={canManageAll || c.owner_user_id === currentUserId}
                  archivingId={archivingId}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onTimeline={onTimeline}
                />
              );
            })}

            {/* Bottom spacer */}
            {paddingBottom > 0 && <tr><td colSpan={8} style={{ height: paddingBottom }} /></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
});
