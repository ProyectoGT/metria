import { createClient } from "@/lib/supabase";
import Header from "@/components/layout/header";
import Breadcrumb from "@/components/ui/breadcrumb";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ZonaDetailPage({
  params,
}: {
  params: Promise<{ zonaId: string }>;
}) {
  const { zonaId } = await params;
  const supabase = await createClient();

  const { data: zona } = await supabase
    .from("zona")
    .select("*, sectores(id, numero, fincas(id, propiedades(id)))")
    .eq("id", Number(zonaId))
    .single();

  if (!zona) notFound();

  const sectores = (zona.sectores ?? []).sort((a, b) => a.numero - b.numero);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Zonas", href: "/zona" },
          { label: zona.nombre },
        ]}
      />
      <Header
        title={zona.nombre}
        description={`${sectores.length} ${sectores.length === 1 ? "sector" : "sectores"} en esta zona`}
      />
      {sectores.length === 0 ? (
        <p className="text-text-secondary">No hay sectores en esta zona.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sectores.map((sector) => {
            const fincaCount = sector.fincas?.length ?? 0;
            const propiedadCount =
              sector.fincas?.reduce(
                (acc, f) => acc + (f.propiedades?.length ?? 0),
                0
              ) ?? 0;

            return (
              <Link
                key={sector.id}
                href={`/zona/${zonaId}/sector/${sector.id}`}
              >
                <div className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-primary hover:shadow-md cursor-pointer">
                  <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
                    Sector {sector.numero}
                  </h3>
                  <div className="mt-3 flex gap-3 text-sm text-text-secondary">
                    <span>
                      <span className="font-medium text-text-primary">
                        {fincaCount}
                      </span>{" "}
                      {fincaCount === 1 ? "finca" : "fincas"}
                    </span>
                    <span>
                      <span className="font-medium text-text-primary">
                        {propiedadCount}
                      </span>{" "}
                      {propiedadCount === 1 ? "prop." : "props."}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
