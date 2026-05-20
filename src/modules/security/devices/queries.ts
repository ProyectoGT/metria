import { createAdminClient } from "@/lib/supabase-admin";
import type { CurrentUserContext } from "@/lib/current-user";
import { getCurrentDeviceFingerprint } from "./device-fingerprint";
import type { UserDevice } from "./types";

type HeaderReader = Pick<Headers, "get">;

type DeviceRow = {
  id: number;
  user_id: number;
  alias?: string | null;
  device_fingerprint: string;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  user_agent?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_ip: string | null;
  last_country: string | null;
  last_city: string | null;
  trusted?: boolean | null;
  trusted_at?: string | null;
  trusted_by?: number | null;
  revoked_at?: string | null;
  revoked_by?: number | null;
};

function mapDevice(row: DeviceRow, currentFingerprint: string): UserDevice {
  return {
    id: row.id,
    userId: row.user_id,
    alias: row.alias ?? null,
    deviceFingerprint: row.device_fingerprint,
    deviceType: row.device_type,
    os: row.os,
    browser: row.browser,
    userAgent: row.user_agent ?? null,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastIp: row.last_ip,
    lastCountry: row.last_country,
    lastCity: row.last_city,
    trustedAt: row.trusted_at ?? (row.trusted ? row.first_seen_at : null),
    trustedBy: row.trusted_by ?? null,
    revokedAt: row.revoked_at ?? null,
    revokedBy: row.revoked_by ?? null,
    isCurrent: row.device_fingerprint === currentFingerprint,
  };
}

function isMissingDeviceManagementColumns(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("device_sessions.alias") ||
    message.includes("device_sessions.user_agent") ||
    message.includes("device_sessions.trusted_at") ||
    message.includes("device_sessions.revoked_at") ||
    message.includes("Could not find the") ||
    message.includes("schema cache")
  );
}

export async function ensureCurrentDevice(
  user: CurrentUserContext,
  requestHeaders: HeaderReader
) {
  const userAgent = requestHeaders.get("user-agent");
  const current = getCurrentDeviceFingerprint(userAgent);
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const extendedPayload = {
    user_id: user.id,
    device_fingerprint: current.deviceIdHash,
    device_type: current.deviceType,
    os: current.os,
    browser: current.browser,
    user_agent: userAgent ? userAgent.slice(0, 500) : null,
    last_seen_at: now,
  };

  const { error } = await supabase.from("device_sessions").upsert(
    extendedPayload,
    { onConflict: "user_id,device_fingerprint" }
  );

  if (isMissingDeviceManagementColumns(error)) {
    await supabase.from("device_sessions").upsert(
      {
        user_id: user.id,
        device_fingerprint: current.deviceIdHash,
        device_type: current.deviceType,
        os: current.os,
        browser: current.browser,
        last_seen_at: now,
      },
      { onConflict: "user_id,device_fingerprint" }
    );
  } else if (error) {
    throw new Error(error.message);
  }

  return current;
}

async function selectDevices(
  supabase: ReturnType<typeof createAdminClient>,
  userId: number,
  extended: boolean
) {
  const columns = extended
    ? "id,user_id,alias,device_fingerprint,device_type,os,browser,user_agent,first_seen_at,last_seen_at,last_ip,last_country,last_city,trusted,trusted_at,trusted_by,revoked_at,revoked_by"
    : "id,user_id,device_fingerprint,device_type,os,browser,first_seen_at,last_seen_at,last_ip,last_country,last_city,trusted";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any)
    .from("device_sessions")
    .select(columns)
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });
}

export async function getMyDevices(
  user: CurrentUserContext,
  requestHeaders: HeaderReader
): Promise<UserDevice[]> {
  const current = await ensureCurrentDevice(user, requestHeaders);
  const supabase = createAdminClient();

  let { data, error } = await selectDevices(supabase, user.id, true);

  if (isMissingDeviceManagementColumns(error)) {
    const legacyResult = await selectDevices(supabase, user.id, false);
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DeviceRow[]).map((row) =>
    mapDevice(row, current.deviceIdHash)
  );
}
