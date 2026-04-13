import { createClient } from "@/lib/supabase";
import Header from "@/components/layout/header";
import Link from "next/link";

export default async function ZonaPage() {
  const supabase = await createClient();
  const { data: zonas } = await supabase
    .from("zona")
    .select("*, sectores(id, fincas(id, propiedades(id)))")
    .order("nombre");

  return (
    <>
      <Header
        title="Zonas"
        description="Selecciona una zona para explorar sus sectores y fincas"
      />
      {!zonas || zonas.length === 0 ? (
        <p className="text-text-secondary">No hay zonas registradas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zonas.map((zona) => {
            const sectorCount = zona.sectores?.length ?? 0;
            const fincaCount =
              zona.sectores?.reduce(
                (acc, s) => acc + (s.fincas?.length ?? 0),
                0
              ) ?? 0;
            const propiedadCount =
              zona.sectores?.reduce(
                (acc, s) =>
                  acc +
                  (s.fincas?.reduce(
                    (a, f) => a + (f.propiedades?.length ?? 0),
                    0
                  ) ?? 0),
                0
              ) ?? 0;

            return (
              <Link key={zona.id} href={`/zona/${zona.id}`}>
                <div className="group rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:border-primary hover:shadow-md cursor-pointer">
                  <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {zona.nombre}
                  </h3>
                  <div className="mt-4 flex gap-4 text-sm text-text-secondary">
                    <span>
                      <span className="font-medium text-text-primary">
                        {sectorCount}
                      </span>{" "}
                      {sectorCount === 1 ? "sector" : "sectores"}
                    </span>
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
                      {propiedadCount === 1 ? "propiedad" : "propiedades"}
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
