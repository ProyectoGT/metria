// ─── InfoSectionCard ─────────────────────────────────────────────────────────
// Bloque de información agrupada en la vista de detalle.
// Muestra campos clave-valor en una grid, con encabezado de sección opcional.
//
// USO:
//   <InfoSectionCard title="Datos de contacto" columns={2}>
//     <InfoField label="Teléfono" value="600 000 000" />
//     <InfoField label="Email" value="juan@mail.com" />
//     <InfoField label="Ciudad" value="Madrid" />
//   </InfoSectionCard>
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

// ── InfoSectionCard ───────────────────────────────────────────────────────────

interface InfoSectionCardProps {
  title?: string;
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
};

export function InfoSectionCard({
  title,
  columns = 2,
  children,
  className = "",
  action,
}: InfoSectionCardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-surface shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {title}
          </p>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`grid gap-x-6 gap-y-4 p-5 ${COLS[columns]}`}>
        {children}
      </div>
    </div>
  );
}

// ── InfoField ─────────────────────────────────────────────────────────────────
// Elemento individual de campo-valor dentro de InfoSectionCard.

interface InfoFieldProps {
  label: string;
  value?: string | ReactNode | null;
  fullWidth?: boolean;
  mono?: boolean;
}

export function InfoField({ label, value, fullWidth = false, mono = false }: InfoFieldProps) {
  return (
    <div className={fullWidth ? "col-span-full" : ""}>
      <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </dt>
      <dd className={`text-sm font-medium text-text-primary ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-text-secondary/50 italic font-normal">—</span>}
      </dd>
    </div>
  );
}

export default InfoSectionCard;
