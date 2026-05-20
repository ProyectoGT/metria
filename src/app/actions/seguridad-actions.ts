"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUserContext } from "@/lib/current-user";

export async function markLoginNotificationRead(id: number) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser || currentUser.role !== "Administrador") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  await supabase
    .from("notificaciones")
    .update({ leido: true, leido_at: new Date().toISOString() })
    .eq("id", id)
    .eq("usuario_id", currentUser.id);

  revalidatePath("/seguridad");
}

export async function markAllLoginNotificationsRead() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser || currentUser.role !== "Administrador") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  await supabase
    .from("notificaciones")
    .update({ leido: true, leido_at: new Date().toISOString() })
    .eq("usuario_id", currentUser.id)
    .eq("leido", false);

  revalidatePath("/seguridad");
}
