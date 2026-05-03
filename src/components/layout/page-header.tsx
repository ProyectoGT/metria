// ─── PageHeader ───────────────────────────────────────────────────────────────
// Cabecera estándar de página con título, descripción, slot de acciones
// y soporte para back-button.
//
// USO mínimo (compatible con código existente):
//   <PageHeader title="Solicitudes" description="Gestión de pedidos." />
//
// USO extendido:
//   <PageHeader
//     title="Usuarios"
//     description="Gestión de accesos y rangos."
//     actions={<Button size="sm">+ Nuevo usuario</Button>}
//   />
//
//   <PageHeader
//     title="Organigrama"
//     back={{ href: "/usuarios", label: "Usuarios" }}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface BackLink {
  href: string;
  label?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: BackLink;
}

export default function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="mb-6 md:mb-8">
      {/* Back link */}
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {back.label ?? "Volver"}
        </Link>
      )}

      {/* Título + acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
