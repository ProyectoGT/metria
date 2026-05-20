"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/roles";

export async function toggleAccessRuleAction(
  role: UserRole,
  resourceKey: string,
  resourceType: string,
  enable: boolean
) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser || currentUser.role !== "Administrador") {
    return { ok: false, error: "No autorizado" };
  }

  const supabase = createAdminClient();
  const empresaId = currentUser.empresaId;
  if (!empresaId) {
    return { ok: false, error: "Empresa no encontrada" };
  }

  const table = "access_control_rules" as const;

  if (enable) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq("empresa_id", empresaId)
      .eq("role", role)
      .eq("resource_key", resourceKey);

    if (error) return { ok: false, error: error.message };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from(table)
      .upsert(
        {
          empresa_id: empresaId,
          role,
          resource_type: resourceType,
          resource_key: resourceKey,
          action: "view",
          enabled: false,
          updated_by: currentUser.id,
        },
        {
          onConflict: "empresa_id, role, resource_key, action",
          ignoreDuplicates: false,
        }
      );

    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/configuracion/control-acceso");
  return { ok: true };
}

export async function toggleBulkRuleAction(
  role: UserRole,
  resourceKey: string,
  resourceType: string,
  enable: boolean
) {
  return toggleAccessRuleAction(role, resourceKey, resourceType, enable);
}
