export type GeoLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const PRIVATE_IP =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost$|unknown$)/;

export async function getGeoFromIp(ip: string): Promise<GeoLocation> {
  const empty: GeoLocation = { country: null, region: null, city: null };
  if (!ip || PRIVATE_IP.test(ip)) return empty;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`,
      { signal: AbortSignal.timeout(3000), cache: "no-store" }
    );
    if (!res.ok) return empty;

    const data = (await res.json()) as {
      status: string;
      country?: string;
      regionName?: string;
      city?: string;
    };

    if (data.status === "success") {
      return {
        country: data.country ?? null,
        region: data.regionName ?? null,
        city: data.city ?? null,
      };
    }
  } catch {
    // best-effort — never block login
  }

  return empty;
}
