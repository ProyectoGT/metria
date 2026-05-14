import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase-admin";
import PageHeader from "@/components/layout/page-header";
import SeguridadClient from "./seguridad-client";

export const dynamic = "force-dynamic";

export type LoginAuditRow = {
  id: number;
  user_id: number;
  empresa_id: number | null;
  user_name: string;
  user_email: string;
  user_role: string;
  login_at: string;
  ip_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  user_agent: string | null;
  is_new_device: boolean;
  status: string;
  failure_reason: string | null;
  device_fingerprint: string | null;
  created_at: string;
};

export default async function SeguridadPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser || currentUser.role !== "Administrador") redirect("/dashboard");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  const { data: rawLogs } = await supabase
    .from("login_audit")
    .select("*")
    .eq("empresa_id", currentUser.empresaId)
    .order("login_at", { ascending: false })
    .limit(500);

  const logs: LoginAuditRow[] = rawLogs ?? [];

  return (
    <>
      <PageHeader
        title="Auditoria de accesos"
        description="Historial de inicios de sesion, dispositivos y actividad de seguridad."
      />
      <SeguridadClient logs={logs} />
    </>
  );
}
