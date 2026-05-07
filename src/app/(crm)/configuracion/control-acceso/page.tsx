import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/current-user";
import { createClient } from "@/lib/supabase";
import { ACCESS_RESOURCES } from "@/lib/access-control/resources";
import type { UserRole } from "@/lib/roles";
import { ControlAccesoClient } from "./control-acceso-client";

export const dynamic = "force-dynamic";

export default async function ControlAccesoPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser || currentUser.role !== "Administrador") redirect("/dashboard");

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawRules } = await (supabase as any)
    .from("access_control_rules")
    .select("*")
    .eq("empresa_id", currentUser.empresaId);

  const rulesByRole: Record<string, string[]> = {};
  const USER_ROLES: UserRole[] = ["Administrador", "Director", "Responsable", "Agente"];

  for (const role of USER_ROLES) {
    rulesByRole[role] = [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const disabledRules = (rawRules ?? []).filter((r: any) => !r.enabled);
  for (const rule of disabledRules) {
    if (rule.role in rulesByRole) {
      rulesByRole[rule.role].push(rule.resource_key);
    }
  }

  return (
    <ControlAccesoClient
      resources={ACCESS_RESOURCES}
      rulesByRole={rulesByRole as Record<UserRole, string[]>}
      currentUserId={currentUser.id}
    />
  );
}
