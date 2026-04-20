import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import SectoresClient from "./sectores-client";
import { notFound } from "next/navigation";

export default async function ZonaDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string }>;
}) {
  const { zonaId } = await params;
  const supabase = await createClient();

  const [user, { data: zona }] = await Promise.all([
    getCurrentUserContext(),
    supabase
      .from("zona")
      .select("id, nombre, sectores(id, numero, posicion, fincas(id, propiedades(id, estado, fecha_visita)))")
      .eq("id", Number(zonaId))
      .single(),
  ]);

  if (!zona) notFound();

  const sectores = (zona.sectores ?? []).sort((a, b) => {
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
