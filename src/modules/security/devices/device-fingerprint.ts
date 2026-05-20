import { createHash } from "crypto";
import { parseUserAgent } from "@/lib/parse-user-agent";

export function getCurrentDeviceFingerprint(userAgent: string | null | undefined) {
  const parsed = parseUserAgent(userAgent ?? "");
  const deviceIdHash = createHash("sha256")
    .update(`${parsed.browser}|${parsed.os}|${parsed.deviceType}`)
    .digest("hex")
    .slice(0, 16);

  return {
    deviceIdHash,
    ...parsed,
  };
}

