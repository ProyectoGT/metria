import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";
import PageHeader from "@/components/layout/page-header";
import PedidosClient from "./pedidos-client";

export default async function PedidosPage() {
  const supabase = await createClient();

  const [user, { data: pedidos }, { data: zonas }] = await Promise.all([
    getCurrentUserContext(),
    supabase.from("pedidos").select("*").order("id", { ascending: false }),
    supabase.from("zona").select("id, nombre").order("nombre"),
  ]);

  return (
    <>
      <PageHeader title="Pedidos" description="Gestion de pedidos y solicitudes" />
      <PedidosClient
        initialPedidos={pedidos ?? []}
        zonas={zonas ?? []}
        currentUserId={user?.id ?? null}
        currentUserRole={user?.role ?? null}
      />
    </>
  );
}
