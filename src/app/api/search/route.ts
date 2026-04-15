import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("propiedades")
    .select(
      "id, propietario, planta, puerta, estado, fincas(id, numero, sectores(id, numero, zona_id))",
    )
    .ilike("propietario", `%${q}%`)
    .limit(10);

  type Row = {
    id: number;
    propietario: string | null;
    planta: string | null;
    puerta: string | null;
    estado: string | null;
    fincas: {
      id: number;
      numero: string;
      sectores: { id: number; numero: number; zona_id: number } | null;
    } | null;
  };

  const results = ((data ?? []) as unknown as Row[])
    .filter(
      (p) =>
        p.fincas?.id &&
        p.fincas?.sectores?.id &&
        p.fincas?.sectores?.zona_id,
    )
    .map((p) => ({
      id: p.id,
      nombre:
        p.propietario?.trim() ||
        [p.planta && `Planta ${p.planta}`, p.puerta && `Puerta ${p.puerta}`]
          .filter(Boolean)
          .join(" ") ||
        `Propiedad #${p.id}`,
      finca: p.fincas!.numero,
      estado: p.estado ?? "",
      href: `/zona/${p.fincas!.sectores!.zona_id}/sector/${p.fincas!.sectores!.id}/finca/${p.fincas!.id}`,
    }));

  return NextResponse.json({ results });
}
