import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import { getUserOrdenAction } from "@/app/(crm)/zona/actions";
import SectoresClient from "./sectores-client";
import { notFound } from "next/navigation";

export default async function ZonaDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string }>;
}) {
  const { zonaId } = await params;
  const supabase = await createClient();

  const [user, { data: zona }, ordenSectores] = await Promise.all([
    getCurrentUserContext(),
    supabase
      .from("zona")
      .select("id, nombre, sectores(id, numero, fincas(id))")
      .eq("id", Number(zonaId))
      .single(),
    getUserOrdenAction("sectores"),
  ]);

  if (!zona) notFound();

  // Recopila todos los IDs de finca de esta zona
  const todasFincas = (zona.sectores ?? []).flatMap((s) => s.fincas ?? []);
  const fincaIds = todasFincas.map((f) => f.id);

  // Cuenta propiedades visibles por finca con el mismo alcance de visibilidad
  // que usa el listado interior (mismos filtros que finca/[fincaId]/page.tsx).
  const propiedadesPerFinca: Record<number, { total: number; contactadas: number }> = {};

  if (fincaIds.length > 0) {
    let conteoQuery = supabase
      .from("propiedades")
      .select("id, finca_id, contactado")
      .in("finca_id", fincaIds);

    if (user?.role === "Agente") {
      conteoQuery = conteoQuery.or(`agente_asignado.eq.${user.id},owner_user_id.eq.${user.id}`) as typeof conteoQuery;
    } else if (user?.role === "Responsable") {
      const ids = [user.id, ...user.supervisedAgentIds];
      conteoQuery = conteoQuery.or(`owner_user_id.eq.${user.id},agente_asignado.in.(${ids.join(",")})`) as typeof conteoQuery;
    }

    const { data: propiedadesConteo } = await conteoQuery;
    for (const p of propiedadesConteo ?? []) {
      if (p.finca_id == null) continue;
      const entry = propiedadesPerFinca[p.finca_id] ?? { total: 0, contactadas: 0 };
      entry.total += 1;
      if (p.contactado) entry.contactadas += 1;
      propiedadesPerFinca[p.finca_id] = entry;
    }
  }

  const sectores = (zona.sectores ?? [])
    .map((s) => ({
      ...s,
      posicion: ordenSectores[s.id] ?? null,
      fincas: (s.fincas ?? []).map((f) => ({
        ...f,
        propiedades: Array.from(
          { length: propiedadesPerFinca[f.id]?.total ?? 0 },
          (_, i) => ({ id: i, contactado: i < (propiedadesPerFinca[f.id]?.contactadas ?? 0) })
        ),
      })),
    }))
    .sort((a, b) => {
      const ap = a.posicion, bp = b.posicion;
      if (ap != null && bp != null) return ap - bp;
      if (ap != null) return -1;
      if (bp != null) return 1;
      return a.numero - b.numero;
    });

  return (
    <SectoresClient
      zonaId={zona.id}
      zonaNombre={zona.nombre}
      initialSectores={sectores as Parameters<typeof SectoresClient>[0]["initialSectores"]}
      canDeleteSectores={user?.canDeleteSectores ?? false}
    />
  );
}
