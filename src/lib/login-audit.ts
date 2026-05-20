import { createAdminClient } from "@/lib/supabase-admin";
import { getGeoFromIp } from "@/lib/geo-ip";
import { getCurrentDeviceFingerprint } from "@/modules/security/devices/device-fingerprint";

export interface LoginAuditParams {
  userId: number;
  empresaId: number | null;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string | null;
  userAgent: string | null;
}

function isMissingDeviceManagementColumns(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("device_sessions.user_agent") ||
    message.includes("device_sessions.revoked_at") ||
    message.includes("Could not find the") ||
    message.includes("schema cache")
  );
}

export async function recordLoginAudit(params: LoginAuditParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;
    const parsed = getCurrentDeviceFingerprint(params.userAgent);
    const geo = params.ipAddress
      ? await getGeoFromIp(params.ipAddress)
      : { country: null, region: null, city: null };

    const fingerprint = parsed.deviceIdHash;

    const { data: existing } = await supabase
      .from("device_sessions")
      .select("id")
      .eq("user_id", params.userId)
      .eq("device_fingerprint", fingerprint)
      .maybeSingle();

    const isNewDevice = !existing;

    const { data: auditRow } = await supabase
      .from("login_audit")
      .insert({
        user_id: params.userId,
        empresa_id: params.empresaId,
        user_name: params.userName,
        user_email: params.userEmail,
        user_role: params.userRole,
        login_at: new Date().toISOString(),
        ip_address: params.ipAddress ?? null,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        device_type: parsed.deviceType,
        os: parsed.os,
        browser: parsed.browser,
        user_agent: params.userAgent ? params.userAgent.slice(0, 500) : null,
        is_new_device: isNewDevice,
        status: "success",
        device_fingerprint: fingerprint,
      })
      .select("id")
      .single();

    const devicePayload = {
      user_id: params.userId,
      device_fingerprint: fingerprint,
      device_type: parsed.deviceType,
      os: parsed.os,
      browser: parsed.browser,
      user_agent: params.userAgent ? params.userAgent.slice(0, 500) : null,
      last_seen_at: new Date().toISOString(),
      last_ip: params.ipAddress ?? null,
      last_country: geo.country,
      last_city: geo.city,
      revoked_at: null,
      revoked_by: null,
    };

    const { error: deviceError } = await supabase.from("device_sessions").upsert(
      devicePayload,
      { onConflict: "user_id,device_fingerprint" }
    );

    if (isMissingDeviceManagementColumns(deviceError)) {
      await supabase.from("device_sessions").upsert(
        {
          user_id: params.userId,
          device_fingerprint: fingerprint,
          device_type: parsed.deviceType,
          os: parsed.os,
          browser: parsed.browser,
          last_seen_at: new Date().toISOString(),
          last_ip: params.ipAddress ?? null,
          last_country: geo.country,
          last_city: geo.city,
        },
        { onConflict: "user_id,device_fingerprint" }
      );
    } else if (deviceError) {
      throw new Error(deviceError.message);
    }

    if (isNewDevice && auditRow && params.empresaId) {
      await notifyAdmins({
        supabase,
        empresaId: params.empresaId,
        userName: params.userName,
        browser: parsed.browser,
        os: parsed.os,
        deviceType: parsed.deviceType,
        city: geo.city,
        country: geo.country,
        loginAuditId: (auditRow as { id: number }).id,
      });
    }
  } catch (err) {
    console.error("[login-audit]", err);
  }
}

async function notifyAdmins(p: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  empresaId: number;
  userName: string;
  browser: string;
  os: string;
  deviceType: string;
  city: string | null;
  country: string | null;
  loginAuditId: number;
}) {
  const { data: admins } = await p.supabase
    .from("usuarios")
    .select("id")
    .eq("empresa_id", p.empresaId)
    .eq("rol", "Administrador")
    .eq("estado", "active");

  if (!admins || admins.length === 0) return;

  const locationStr =
    [p.city, p.country].filter(Boolean).join(", ") || "ubicacion desconocida";
  const deviceLabel =
    p.deviceType === "mobile"
      ? "movil"
      : p.deviceType === "tablet"
      ? "tablet"
      : "desktop";

  const titulo = "Nuevo inicio de sesion detectado";
  const mensaje = `${p.userName} inicio sesion desde ${p.browser} en ${p.os} (${deviceLabel}), ${locationStr}.`;

  const rows = admins.map((a: { id: number }) => ({
    usuario_id: a.id,
    empresa_id: p.empresaId,
    tipo: "nuevo_login",
    titulo,
    mensaje,
    login_audit_id: p.loginAuditId,
    leido: false,
  }));

  await p.supabase.from("notificaciones").insert(rows);
}
