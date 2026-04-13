import { createClient } from "@/lib/supabase";
import Header from "@/components/layout/header";
import PedidosClient from "./pedidos-client";

export default async function PedidosPage() {
  const supabase = await createClient();

  const [{ data: pedidos }, { data: zonas }] = await Promise.all([
    supabase.from("pedidos").select("*").order("id", { ascending: false }),
    supabase.from("zona").select("id, nombre").order("nombre"),
  ]);

  return (
    <>
      <Header title="Pedidos" description="Gestión de pedidos y solicitudes" />
      <PedidosClient
        initialPedidos={pedidos ?? []}
        zonas={zonas ?? []}
      />
    </>
  );
}
