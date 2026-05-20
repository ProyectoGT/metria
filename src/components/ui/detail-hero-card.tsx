// ─── DetailHeroCard ───────────────────────────────────────────────────────────
// Cabecera hero para vistas de detalle: encargo, pedido, contacto, usuario.
// Muestra avatar/icono, título, subtítulo, badges y acciones laterales.
//
// USO:
//   <DetailHeroCard
//     title="Juan García"
//     subtitle="Cliente · Zona Centro"
//     badge={{ label: "Activo", variant: "success" }}
//     avatar={{ initials: "JG", color: "bg-primary" }}
//     meta={[{ label: "Teléfono", value: "600 000 000" }]}
//     actions={<Button size="sm" variant="secondary">Editar</Button>}
//     onClose={() => setOpen(false)}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import { X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Badge {
  label: string;
  className?: string;
}

interface MetaItem {
  label: string;
  value: string | ReactNode;
  icon?: LucideIcon;
}

interface AvatarConfig {
  initials: string;
  color?: string;
}

interface DetailHeroCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: Badge;
  badges?: Badge[];
  avatar?: AvatarConfig;
  icon?: LucideIcon;
  iconColor?: string;
  meta?: MetaItem[];
  actions?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export default function DetailHeroCard({
  title,
  subtitle,
  description,
  badge,
  badges,
  avatar,
  icon: Icon,
  iconColor = "text-primary bg-primary/10",
  meta = [],
  actions,
  onClose,
  className = "",
}: DetailHeroCardProps) {
  const allBadges = [...(badge ? [badge] : []), ...(badges ?? [])];

  return (
    <div className={`flex shrink-0 flex-col gap-3 border-b border-border bg-surface px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Avatar o icono */}
          {avatar ? (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatar.color ?? "bg-primary"}`}>
              {avatar.initials}
            </div>
          ) : Icon ? (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
          ) : null}

          {/* Texto */}
          <div className="min-w-0">
            {/* Badges arriba del título */}
            {allBadges.length > 0 && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {allBadges.map((b, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.className ?? "bg-primary/10 text-primary"}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            <h2 className="truncate text-base font-semibold text-text-primary leading-tight">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-text-secondary">{subtitle}</p>
            )}

            {description && (
              <p className="mt-1 text-xs text-text-secondary line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        {/* Acciones + cerrar */}
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Meta info inline */}
      {meta.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {meta.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {item.icon && <item.icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" />}
              <span className="text-xs text-text-secondary">{item.label}:</span>
              <span className="text-xs font-medium text-text-primary">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
