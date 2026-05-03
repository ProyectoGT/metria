import type { OrgUser } from "@/lib/org-chart";
import { ESTADO_LABEL, ESTADO_STYLE, ROL_STYLE } from "@/lib/org-chart";

type Props = {
  users: OrgUser[];
  allUsers: OrgUser[];
};

export default function OrgTable({ users, allUsers }: Props) {
  const byId = new Map(allUsers.map((u) => [u.id, u]));

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-text-secondary">
        No hay usuarios que mostrar con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-background text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <th className="px-5 py-3">Usuario</th>
            <th className="px-5 py-3">Rango</th>
            <th className="px-5 py-3">Estado</th>
            <th className="px-5 py-3">Responsable</th>
            <th className="px-5 py-3">Equipo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => {
            const estado = (u.estado ?? "active") as keyof typeof ESTADO_LABEL;
            const supervisor = u.supervisorId ? byId.get(u.supervisorId) : null;
            const isDisabled = u.estado === "disabled";

            return (
              <tr
                key={u.id}
                className={`hover:bg-background transition-colors ${isDisabled ? "opacity-50" : ""}`}
              >
                {/* Usuario */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {`${u.nombre[0] ?? ""}${u.apellidos[0] ?? ""}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {u.nombre} {u.apellidos}
                      </p>
                      <p className="text-xs text-text-secondary">{u.correo}</p>
                    </div>
                  </div>
                </td>

                {/* Rango */}
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      ROL_STYLE[u.rol] ?? "bg-muted text-text-secondary"
                    }`}
                  >
                    {u.rol}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      ESTADO_STYLE[estado] ?? "bg-muted text-text-secondary"
                    }`}
                  >
                    {ESTADO_LABEL[estado] ?? u.estado}
                  </span>
                </td>

                {/* Responsable */}
                <td className="px-5 py-3 text-text-secondary">
                  {supervisor
                    ? `${supervisor.nombre} ${supervisor.apellidos}`
                    : <span className="italic text-text-secondary/50">—</span>}
                </td>

                {/* Equipo */}
                <td className="px-5 py-3 text-text-secondary">
                  {u.equipoNombre ?? <span className="italic text-text-secondary/50">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
