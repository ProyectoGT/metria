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
      .select("id, nombre, sectores(id, numero, fincas(id, propiedades(id, estado, fecha_visita)))")
      .eq("id", Number(zonaId))
      .single(),
    getUserOrdenAction("sectores"),
  ]);

  if (!zona) notFound();

  const sectores = (zona.sectores ?? [])
    .map((s) => ({ ...s, posicion: ordenSectores[s.id] ?? null }))
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
