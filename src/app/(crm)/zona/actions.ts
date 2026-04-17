"use server";

import { createClient } from "@/lib/supabase";
import { getCurrentUserContext } from "@/lib/current-user";

export async function updatePropiedadesPosicionesAction(
  positions: Array<{ id: number; posicion: number }>
): Promise<{ error?: string }> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };

  const supabase = await createClient();

  const updates = await Promise.all(
    positions.map(({ id, posicion }) =>
      supabase.from("propiedades").update({ posicion }).eq("id", id)
    )
  );

  const failed = updates.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  return {};
}
