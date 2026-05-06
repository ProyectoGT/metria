import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Euro, MapPin, Phone, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/components/ui/breadcrumb";

type PropiedadDetail = {
  id: number;
  planta: string | null;
  puerta: string | null;
  propietario: string | null;
  telefono: string | null;
  estado: string | null;
  fecha_visita: string | null;
  notas: string | null;
  honorarios: number | null;
  latitud: number | null;
  longitud: number | null;
  contactado: boolean | null;
  contactado_hasta: string | null;
  usuarios: { id: number; nombre: string | null; apellidos: string | null } | null;
  fincas: {
    id: number;
    numero: string | null;
    sectores: {
      id: number;
      numero: number | null;
      zona: { id: number; nombre: string | null } | null;
    } | null;
  } | null;
};

function propiedadNombre(propiedad: PropiedadDetail) {
  if (propiedad.propietario?.trim()) return propiedad.propietario;
  const planta = propiedad.planta ?? "";
  const puerta = propiedad.puerta ?? "";
  if (planta || puerta) return `Planta ${planta || "-"}${puerta ? ` ${puerta}` : ""}`;
  return `Propiedad #${propiedad.id}`;
}

function estadoClasses(estado: string | null) {
  const s = estado?.toLowerCase() ?? "";
  if (s.startsWith("encarg")) return "bg-green-500/15 text-green-700";
  if (s === "vendido") return "bg-emerald-500/15 text-emerald-700";
  if (s === "seguimiento") return "bg-amber-500/15 text-amber-700";
  if (s === "noticia") return "bg-blue-500/15 text-blue-700";
  if (s.startsWith("investig")) return "bg-purple-500/15 text-purple-700";
  return "bg-gray-500/15 text-gray-600";
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PropiedadDetailPage({
  params,
}: {
  params: Promise<{ propiedadId: string }>;
}) {
  const { propiedadId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("propiedades")
    .select(`
      id,
      planta,
      puerta,
      propietario,
      telefono,
      estado,
      fecha_visita,
      notas,
      honorarios,
      latitud,
      longitud,
      contactado,
      contactado_hasta,
      usuarios:usuarios!propiedades_agente_asignado_fkey(id, nombre, apellidos),
      fincas(
        id,
        numero,
        sectores(
          id,
          numero,
          zona(id, nombre)
        )
      )
    `)
    .eq("id", Number(propiedadId))
    .maybeSingle();

  if (!data) notFound();

  const propiedad = data as unknown as PropiedadDetail;
  const zona = propiedad.fincas?.sectores?.zona;
  const sector = propiedad.fincas?.sectores;
  const finca = propiedad.fincas;
  const agente = propiedad.usuarios
    ? `${propiedad.usuarios.nombre ?? ""} ${propiedad.usuarios.apellidos ?? ""}`.trim()
    : "";

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Zonas", href: "/zona" },
          ...(zona ? [{ label: zona.nombre ?? `Zona ${zona.id}`, href: `/zona/${zona.id}` }] : []),
          ...(zona && sector ? [{ label: `Sector ${sector.numero ?? sector.id}`, href: `/zona/${zona.id}/sector/${sector.id}` }] : []),
          ...(zona && sector && finca ? [{ label: `Finca ${finca.numero ?? finca.id}`, href: `/zona/${zona.id}/sector/${sector.id}/finca/${finca.id}` }] : []),
          { label: propiedadNombre(propiedad) },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={zona && sector && finca ? `/zona/${zona.id}/sector/${sector.id}/finca/${finca.id}` : "/dashboard"}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{propiedadNombre(propiedad)}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {[
              finca?.numero ? `Finca ${finca.numero}` : null,
              sector?.numero != null ? `Sector ${sector.numero}` : null,
              zona?.nombre ?? null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${estadoClasses(propiedad.estado)}`}>
          {propiedad.estado ? propiedad.estado.charAt(0).toUpperCase() + propiedad.estado.slice(1) : "Sin estado"}
        </span>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Datos de la propiedad</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Planta" value={propiedad.planta ?? "-"} />
            <Info label="Puerta" value={propiedad.puerta ?? "-"} />
            <Info label="Propietario" value={propiedad.propietario ?? "-"} />
            <Info label="Telefono" value={propiedad.telefono ?? "-"} icon={<Phone className="h-4 w-4" />} />
            <Info label="Agente asignado" value={agente || "Sin asignar"} icon={<UserRound className="h-4 w-4" />} />
            <Info label="Fecha de visita" value={formatDate(propiedad.fecha_visita)} icon={<Calendar className="h-4 w-4" />} />
            <Info label="Honorarios" value={propiedad.honorarios != null ? `${propiedad.honorarios.toLocaleString("es-ES")} EUR` : "-"} icon={<Euro className="h-4 w-4" />} />
            <Info label="Contactado" value={propiedad.contactado ? "Si" : "No"} />
          </dl>

          {propiedad.notas && (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Notas</h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{propiedad.notas}</p>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Ubicacion</h2>
          <div className="space-y-3 text-sm text-text-secondary">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {[zona?.nombre, sector?.numero != null ? `Sector ${sector.numero}` : null, finca?.numero ? `Finca ${finca.numero}` : null]
                  .filter(Boolean)
                  .join(" · ") || "Sin ubicacion"}
              </span>
            </p>
            {propiedad.latitud != null && propiedad.longitud != null && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${propiedad.latitud},${propiedad.longitud}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Abrir en Maps
              </a>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-text-primary">
        {icon ? <span className="text-text-secondary">{icon}</span> : null}
        {value}
      </dd>
    </div>
  );
}
