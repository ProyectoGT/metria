import type {
  WhatsAppProvider,
  SendTextMessageInput,
  SendTextMessageResult,
  WhatsAppSessionInfo,
  WhatsAppProviderCapabilities,
} from '../types';
import { formatPhoneForWhatsApp, buildWhatsAppUrl } from '@/lib/whatsapp';

export class ManualProvider implements WhatsAppProvider {
  readonly name = 'manual' as const;

  getCapabilities(): WhatsAppProviderCapabilities {
    return { automaticSend: false, qr: false, webhooks: false, sessions: false };
  }

  async sendTextMessage(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    const normalized = formatPhoneForWhatsApp(input.to);
    if (!normalized) {
      return {
        provider: 'manual',
        success: false,
        status: 'failed',
        errorCode: 'INVALID_PHONE',
        errorMessage: 'Número de teléfono no válido.',
      };
    }

    const fallbackUrl = buildWhatsAppUrl(input.to, input.text);
    return {
      provider: 'manual',
      success: true,
      status: 'draft',
      fallbackUrl,
    };
  }

  async getSessionStatus(): Promise<WhatsAppSessionInfo> {
    return {
      provider: 'manual',
      status: 'not_configured',
      errorMessage: 'El proveedor manual no gestiona sesiones.',
    };
  }
}
