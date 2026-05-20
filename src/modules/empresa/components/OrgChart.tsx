import OrgUserCard from "./OrgUserCard";
import type { OrgTree } from "@/modules/empresa/services/org-chart";

type Props = {
  tree: OrgTree;
};

// Línea vertical conectora entre niveles
function Connector() {
  return (
    <div className="flex justify-center">
      <div className="w-px bg-border" style={{ height: 32 }} />
    </div>
  );
}

// Fila horizontal de tarjetas con líneas de conexión entre ellas
function HRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          {label}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-6">{children}</div>
    </div>
  );
}

export default function OrgChart({ tree }: Props) {
  const { admins, directores, responsables, agentesHuerfanos } = tree;

  const topLevel = [...admins, ...directores];
  const hasResponsables = responsables.length > 0;
  const hasHuerfanos = agentesHuerfanos.length > 0;

  if (
    topLevel.length === 0 &&
    !hasResponsables &&
    !hasHuerfanos
  ) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-text-secondary">
        No hay usuarios que mostrar con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 overflow-x-auto pb-8">

      {/* ── Nivel 1: Administradores y Directores ─────────────────────── */}
      {topLevel.length > 0 && (
        <>
          <HRow label={topLevel.length > 0 ? "Administracion" : undefined}>
            {admins.map((u) => (
              <OrgUserCard key={u.id} user={u} />
            ))}
            {directores.map((u) => (
              <OrgUserCard key={u.id} user={u} />
            ))}
          </HRow>

          {(hasResponsables || hasHuerfanos) && <Connector />}
        </>
      )}

      {/* ── Nivel 2: Responsables + sus agentes ───────────────────────── */}
      {hasResponsables && (
        <>
          <HRow label="Responsables">
            {responsables.map((resp) => (
              <OrgUserCard
                key={resp.id}
                user={resp}
                agentCount={resp.agentes.length}
              />
            ))}
          </HRow>

          {/* Grupos de agentes bajo cada responsable */}
          <div className="mt-4 flex flex-wrap justify-center gap-8">
            {responsables.map((resp) =>
              resp.agentes.length > 0 ? (
                <div key={resp.id} className="flex flex-col items-center gap-0">
                  <Connector />
                  <div className="relative flex flex-wrap justify-center gap-4">
                    {/* Línea horizontal sobre los agentes */}
                    {resp.agentes.length > 1 && (
                      <div
                        className="absolute top-0 left-1/2 h-px -translate-x-1/2 bg-border"
                        style={{ width: `calc(100% - 104px)` }}
                      />
                    )}
                    {resp.agentes.map((a) => (
                      <div key={a.id} className="flex flex-col items-center gap-0">
                        {resp.agentes.length > 1 && <Connector />}
                        <OrgUserCard user={a} compact />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </>
      )}

      {/* ── Agentes sin responsable ────────────────────────────────────── */}
      {hasHuerfanos && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text-secondary">
            Sin responsable asignado
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {agentesHuerfanos.map((u) => (
              <OrgUserCard key={u.id} user={u} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
