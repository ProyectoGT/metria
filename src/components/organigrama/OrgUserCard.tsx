import { Users } from "lucide-react";
import type { OrgUser } from "@/lib/org-chart";
import { ESTADO_LABEL, ESTADO_STYLE, ROL_STYLE } from "@/lib/org-chart";

type Props = {
  user: OrgUser;
  agentCount?: number;
  compact?: boolean;
};

function initials(nombre: string, apellidos: string) {
  return `${nombre[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
}

export default function OrgUserCard({ user, agentCount, compact = false }: Props) {
  const estado = (user.estado ?? "active") as keyof typeof ESTADO_LABEL;
  const estadoLabel = ESTADO_LABEL[estado] ?? user.estado;
  const estadoStyle = ESTADO_STYLE[estado] ?? "bg-muted text-text-secondary";
  const rolStyle = ROL_STYLE[user.rol] ?? "bg-muted text-text-secondary";
  const isDisabled = user.estado === "disabled";

  return (
    <div
      className={`flex w-52 flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-opacity ${
        isDisabled ? "opacity-50" : ""
      }`}
    >
      {/* Avatar + nombre */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {initials(user.nombre, user.apellidos)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {user.nombre} {user.apellidos}
          </p>
          {!compact && (
            <p className="truncate text-[11px] text-text-secondary">{user.correo}</p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rolStyle}`}>
          {user.rol}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${estadoStyle}`}>
          {estadoLabel}
        </span>
      </div>

      {/* Equipo */}
      {user.equipoNombre && (
        <p className="text-[11px] text-text-secondary">
          Equipo: <span className="font-medium text-text-primary">{user.equipoNombre}</span>
        </p>
      )}

      {/* Agentes a cargo */}
      {agentCount !== undefined && agentCount > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-text-secondary">
          <Users className="h-3 w-3" />
          <span>{agentCount} agente{agentCount > 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}
