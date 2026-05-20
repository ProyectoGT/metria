import type { WhatsAppProvider, WhatsAppProviderName, WhatsAppProviderCapabilities } from './types';
import { getActiveWhatsAppProviderName, isOpenWaConfigured } from './config';
import { ManualProvider } from './providers/manual-provider';
import { MetaProvider } from './providers/meta-provider';
import { OpenWaProvider } from './providers/openwa-provider';

// Devuelve el proveedor activo según WHATSAPP_PROVIDER.
// Si el proveedor pedido no está disponible, cae al manual silenciosamente.
export function getWhatsAppProvider(): WhatsAppProvider {
  const providerName = getActiveWhatsAppProviderName();
  return buildProvider(providerName);
}

function buildProvider(name: WhatsAppProviderName): WhatsAppProvider {
  switch (name) {
    case 'meta':
      return new MetaProvider();
    case 'openwa':
      if (!isOpenWaConfigured()) {
        console.warn('[whatsapp] WHATSAPP_PROVIDER=openwa pero OpenWA no está configurado. Usando manual.');
        return new ManualProvider();
      }
      return new OpenWaProvider();
    case 'manual':
    default:
      return new ManualProvider();
  }
}

// Información del proveedor activo para mostrar en la UI.
export function getWhatsAppProviderInfo(): {
  providerName: WhatsAppProviderName;
  isAutomatic: boolean;
  label: string;
  capabilities: WhatsAppProviderCapabilities;
} {
  const provider = getWhatsAppProvider();
  const caps = provider.getCapabilities();
  return {
    providerName: provider.name,
    isAutomatic: caps.automaticSend,
    label: PROVIDER_LABELS[provider.name],
    capabilities: caps,
  };
}

const PROVIDER_LABELS: Record<WhatsAppProviderName, string> = {
  manual: 'Manual (wa.me)',
  meta:   'WhatsApp Cloud API (Meta)',
  openwa: 'OpenWA (self-hosted)',
};
