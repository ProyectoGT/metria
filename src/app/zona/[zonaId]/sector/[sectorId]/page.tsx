import { createClient } from "@/lib/supabase";
import Header from "@/components/layout/header";
import Breadcrumb from "@/components/ui/breadcrumb";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SectorDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string; sectorId: string }>;
}) {
  const { zonaId, sectorId } = await params;
  const supabase = await createClient();

  const [{ data: zona }, { data: sector }] = await Promise.all([
    supabase.from("zona").select("id, nombre").eq("id", Number(zonaId)).single(),
    supabase
      .from("sectores")
      .select("id, numero, fincas(id, numero, propiedades(id))")
      .eq("id", Number(sectorId))
      .single(),
  ]);

  if (!zona || !sector) notFound();

  const fincas = (sector.fincas ?? []).sort((a, b) => a.numero - b.numero);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Zonas", href: "/zona" },
          { label: zona.nombre, href: `/zona/${zonaId}` },
          { label: `Sector ${sector.numero}` },
        ]}
      />
      <Header
        title={`Sector ${sector.numero}`}
        description={`${fincas.length} ${fincas.length === 1 ? "finca" : "fincas"} en este sector`}
      />
      {fincas.length === 0 ? (
        <p className="text-text-secondary">No hay fincas en este sector.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {fincas.map((finca) => {
            const propiedadCount = finca.propiedades?.length ?? 0;

            return (
              <Link
                key={finca.id}
                href={`/zona/${zonaId}/sector/${sectorId}/finca/${finca.id}`}
              >
                <div className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-primary hover:shadow-md cursor-pointer">
                  <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
                    Finca {finca.numero}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">
                      {propiedadCount}
                    </span>{" "}
                    {propiedadCount === 1 ? "propiedad" : "propiedades"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
