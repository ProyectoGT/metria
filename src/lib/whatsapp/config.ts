import type { WhatsAppProviderName } from './types';

export interface OpenWaConfig {
  baseUrl: string;
  apiKey: string;
  defaultSessionId: string;
  defaultSessionName: string;
  webhookSecret: string | null;
  timeoutMs: number;
}

const VALID_PROVIDERS: WhatsAppProviderName[] = ['manual', 'meta', 'openwa'];

function parseProviderName(raw: string | undefined, fallback: WhatsAppProviderName): WhatsAppProviderName {
  if (raw && VALID_PROVIDERS.includes(raw as WhatsAppProviderName)) {
    return raw as WhatsAppProviderName;
  }
  return fallback;
}

export function getActiveWhatsAppProviderName(): WhatsAppProviderName {
  return parseProviderName(process.env.WHATSAPP_PROVIDER, 'manual');
}

export function getFallbackProviderName(): WhatsAppProviderName {
  return parseProviderName(process.env.WHATSAPP_FALLBACK_PROVIDER, 'manual');
}

export function isOpenWaConfigured(): boolean {
  return Boolean(process.env.OPENWA_BASE_URL && process.env.OPENWA_API_KEY);
}

export function getOpenWaConfig(): OpenWaConfig | null {
  if (!isOpenWaConfigured()) return null;
  return {
    baseUrl: (process.env.OPENWA_BASE_URL as string).replace(/\/$/, ''),
    apiKey: process.env.OPENWA_API_KEY as string,
    defaultSessionId: process.env.OPENWA_DEFAULT_SESSION_ID ?? '',
    defaultSessionName: process.env.OPENWA_DEFAULT_SESSION_NAME ?? 'metria-main',
    webhookSecret: process.env.OPENWA_WEBHOOK_SECRET ?? null,
    timeoutMs: Number(process.env.OPENWA_TIMEOUT_MS ?? 10000),
  };
}
