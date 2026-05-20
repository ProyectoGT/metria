import type {
  WhatsAppProvider,
  SendTextMessageInput,
  SendTextMessageResult,
  WhatsAppSessionInfo,
  NormalizedIncomingWhatsAppMessage,
  WhatsAppProviderCapabilities,
} from '../types';
import {
  sendTextMessage,
  isApiEnabled,
  verifyWebhookSignature,
  parseWebhookPayload,
} from '@/lib/whatsapp-api';
import { formatPhoneForWhatsApp, buildWhatsAppUrl } from '@/lib/whatsapp';

// Wraps the existing Meta WhatsApp Cloud API integration.
// Does not rewrite any existing logic; adapts output to the common WhatsAppProvider interface.

export class MetaProvider implements WhatsAppProvider {
  readonly name = 'meta' as const;

  getCapabilities(): WhatsAppProviderCapabilities {
    return {
      automaticSend: isApiEnabled(),
      qr: false,
      webhooks: true,
      sessions: false,
    };
  }

  async sendTextMessage(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    if (!isApiEnabled()) {
      const fallbackUrl = buildWhatsAppUrl(input.to, input.text);
      return {
        provider: 'meta',
        success: false,
        status: 'failed',
        errorCode: 'OPENWA_NOT_CONFIGURED',
        errorMessage: 'WhatsApp Cloud API no está configurada.',
        fallbackUrl,
      };
    }

    const normalized = formatPhoneForWhatsApp(input.to) ?? input.to.replace(/\D/g, '');
    const result = await sendTextMessage({ to: normalized, body: input.text });

    if (result.ok) {
      return {
        provider: 'meta',
        success: true,
        messageId: result.messageId,
        externalMessageId: result.messageId,
        status: 'sent',
      };
    }

    const fallbackUrl = buildWhatsAppUrl(input.to, input.text);
    return {
      provider: 'meta',
      success: false,
      status: 'failed',
      errorMessage: result.error,
      fallbackUrl,
    };
  }

  async getSessionStatus(): Promise<WhatsAppSessionInfo> {
    if (!isApiEnabled()) {
      return {
        provider: 'meta',
        status: 'not_configured',
        errorMessage: 'Configura WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID.',
      };
    }
    return { provider: 'meta', status: 'connected' };
  }

  async validateWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
    return verifyWebhookSignature(rawBody, signature);
  }

  async normalizeIncomingWebhook(payload: unknown): Promise<NormalizedIncomingWhatsAppMessage | null> {
    const parsed = parseWebhookPayload(payload);
    if (parsed.kind !== 'messages' || parsed.messages.length === 0) return null;

    const msg = parsed.messages[0];
    return {
      provider: 'meta',
      eventId: msg.messageId,
      idempotencyKey: msg.messageId,
      externalMessageId: msg.messageId,
      from: msg.from,
      body: msg.text,
      type: msg.type,
      direction: 'inbound',
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
      waTimestamp: msg.timestamp,
      raw: payload,
    };
  }
}
