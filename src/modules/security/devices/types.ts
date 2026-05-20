export type UserDevice = {
  id: number;
  userId: number;
  alias: string | null;
  deviceFingerprint: string;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  userAgent: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastIp: string | null;
  lastCountry: string | null;
  lastCity: string | null;
  trustedAt: string | null;
  trustedBy: number | null;
  revokedAt: string | null;
  revokedBy: number | null;
  isCurrent: boolean;
};

export type DeviceActionResult = {
  ok: boolean;
  error?: string;
  signedOut?: boolean;
};

