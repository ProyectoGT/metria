import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Car, Euro, Home, MapPin, Phone, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Breadcrumb from "@/components/ui/breadcrumb";
import { ACCESS_SCOPE_LABELS, normalizeAccessScope } from "@/lib/access-scope";
import { formatModalidadPedido } from "@/modules/solicitudes/services/modalidades";

type PedidoDetail = {
  id: number;
  nombre_cliente: string;
  telefono: string | null;
  tipo_propiedad: string | null;
  zona_busqueda: string | null;
  presupuesto: number | null;
  modalidad: string | null;
  habitaciones: number | null;
  banos: number | null;
  altura_deseada: string | null;
  garaje: boolean | null;
  origen: string | null;
  referencia: string | null;
  notas: string | null;
  visibility: string | null;
  usuarios: { id: number; nombre: string | null; apellidos: string | null } | null;
  zona: { id: number; nombre: string | null } | null;
};

function formatPresupuesto(value: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function origenLabel(value: string | null) {
  if (value === "oficina") return "Oficina";
  if (value === "online") return "Online";
  return value ?? "-";
}

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ pedidoId: string }>;
}) {
  const { pedidoId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("pedidos")
    .select(`
      id,
      nombre_cliente,
      telefono,
      tipo_propiedad,
      zona_busqueda,
      presupuesto,
      modalidad,
      habitaciones,
      banos,
      altura_deseada,
      garaje,
      origen,
      referencia,
      notas,
      visibility,
      usuarios:usuarios!pedidos_owner_user_id_fkey(id, nombre, apellidos),
      zona:zona_deseada(id, nombre)
    `)
    .eq("id", Number(pedidoId))
    .maybeSingle();

  if (!data) notFound();

  const pedido = data as unknown as PedidoDetail;
  const agente = pedido.usuarios
    ? `${pedido.usuarios.nombre ?? ""} ${pedido.usuarios.apellidos ?? ""}`.trim()
    : "";
  const scope = normalizeAccessScope(pedido.visibility);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Solicitudes", href: "/solicitudes" },
          { label: pedido.nombre_cliente },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/solicitudes"
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{pedido.nombre_cliente}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {[pedido.tipo_propiedad, pedido.zona_busqueda ?? pedido.zona?.nombre, formatModalidadPedido(pedido.modalidad)]
              .filter((item) => item && item !== "-")
              .join(" · ") || "Solicitud"}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-green-500/15 px-3 py-1 text-sm font-medium text-green-700">
          Activo
        </span>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Datos de la solicitud</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Cliente" value={pedido.nombre_cliente} icon={<UserRound className="h-4 w-4" />} />
            <Info label="Telefono" value={pedido.telefono ?? "-"} icon={<Phone className="h-4 w-4" />} />
            <Info label="Tipo de propiedad" value={pedido.tipo_propiedad ?? "-"} icon={<Home className="h-4 w-4" />} />
            <Info label="Presupuesto" value={formatPresupuesto(pedido.presupuesto)} icon={<Euro className="h-4 w-4" />} />
            <Info label="Modalidad" value={formatModalidadPedido(pedido.modalidad)} />
            <Info label="Habitaciones" value={pedido.habitaciones != null ? String(pedido.habitaciones) : "-"} icon={<BedDouble className="h-4 w-4" />} />
            <Info label="Banos" value={pedido.banos != null ? String(pedido.banos) : "-"} icon={<Bath className="h-4 w-4" />} />
            <Info label="Garaje" value={pedido.garaje === true ? "Si" : pedido.garaje === false ? "No" : "-"} icon={<Car className="h-4 w-4" />} />
            <Info label="Altura deseada" value={pedido.altura_deseada ?? "-"} />
            <Info label="Origen" value={origenLabel(pedido.origen)} />
            <Info label="Referencia" value={pedido.referencia ?? "-"} />
            <Info label="Agente" value={agente || "Sin asignar"} icon={<UserRound className="h-4 w-4" />} />
          </dl>

          {pedido.notas && (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Notas</h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{pedido.notas}</p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Zona de busqueda</h2>
            <p className="flex items-start gap-2 text-sm text-text-secondary">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{pedido.zona_busqueda ?? pedido.zona?.nombre ?? "Sin zona indicada"}</span>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold text-text-primary">Visibilidad</h2>
            <p className="text-sm text-text-secondary">{ACCESS_SCOPE_LABELS[scope]}</p>
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
