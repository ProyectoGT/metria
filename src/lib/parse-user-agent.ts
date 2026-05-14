export type ParsedUA = {
  browser: string;
  os: string;
  deviceType: "mobile" | "tablet" | "desktop";
};

export function parseUserAgent(ua: string): ParsedUA {
  // Device — check tablet before mobile to avoid false positives
  let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
  if (/tablet|ipad|kindle|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|android(?!.*tablet)|iphone|ipod|blackberry|windows phone|opera mini|opera mobi/i.test(ua)) {
    deviceType = "mobile";
  }

  // OS
  let os = "Desconocido";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/ipad|iphone|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  // Browser — order matters: check forks before the base engine
  let browser = "Desconocido";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung";
  else if (/firefox\/|fxios/i.test(ua)) browser = "Firefox";
  else if (/crios\//i.test(ua)) browser = "Chrome";
  else if (/chrome\/\d/i.test(ua)) browser = "Chrome";
  else if (/safari\/\d/i.test(ua)) browser = "Safari";

  return { browser, os, deviceType };
}
