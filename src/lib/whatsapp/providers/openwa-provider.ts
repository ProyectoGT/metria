import type {
  WhatsAppProvider,
  SendTextMessageInput,
  SendTextMessageResult,
  WhatsAppSessionInfo,
  WhatsAppSessionStatus,
  NormalizedIncomingWhatsAppMessage,
  WhatsAppProviderCapabilities,
} from '../types';
import { getOpenWaConfig } from '../config';
import { OpenWaError, openWaErrorCodeToUserMessage } from '../errors';
import { OpenWaClient, type OpenWaSession } from './openwa-client';
import { buildWhatsAppUrl, formatPhoneForWhatsApp } from '@/lib/whatsapp';

// Normaliza un teléfono al formato chatId que espera OpenWA: "34600111222@c.us"
// Reutiliza la misma lógica de España de formatPhoneForWhatsApp para coherencia.
export function normalizePhoneToOpenWaChatId(phone: string): string {
  if (phone.endsWith('@c.us')) {
    const digits = phone.replace('@c.us', '');
    if (!/^\d{7,15}$/.test(digits)) {
      throw new OpenWaError('INVALID_PHONE', `chatId inválido: ${phone}`);
    }
    return phone;
  }

  const normalized = formatPhoneForWhatsApp(phone);
  if (!normalized) {
    throw new OpenWaError('INVALID_PHONE', `Número de teléfono inválido para OpenWA: ${phone}`);
  }

  return `${normalized}@c.us`;
}

// Mapea los estados de sesión que reporta OpenWA a nuestro tipo interno.
function mapSessionStatus(rawStatus: string): WhatsAppSessionStatus {
  const s = rawStatus.toUpperCase();
  if (s === 'INITIALIZING' || s === 'INIT') return 'initializing';
  if (s === 'SCAN_QR' || s === 'QR' || s === 'QRCODE') return 'scan_qr';
  if (s === 'CONNECTING') return 'connecting';
  if (s === 'CONNECTED' || s === 'AUTHENTICATED' || s === 'READY') return 'connected';
  if (s === 'DISCONNECTED' || s === 'LOGOUT' || s === 'CLOSED') return 'disconnected';
  if (s === 'FAILED' || s === 'TIMEOUT' || s === 'CONFLICT') return 'failed';
  return 'failed';
}

export class OpenWaProvider implements WhatsAppProvider {
  readonly name = 'openwa' as const;
  private readonly client: OpenWaClient | null;

  constructor() {
    const cfg = getOpenWaConfig();
    this.client = cfg ? new OpenWaClient(cfg) : null;
  }

  getCapabilities(): WhatsAppProviderCapabilities {
    return {
      automaticSend: this.client !== null,
      qr: true,
      webhooks: true,
      sessions: true,
    };
  }

  // Resuelve el sessionId, buscando por nombre si no está configurado un ID fijo.
  private async resolveSessionId(): Promise<string> {
    const cfg = getOpenWaConfig();
    if (!cfg || !this.client) throw new OpenWaError('OPENWA_NOT_CONFIGURED', 'OpenWA no está configurado.');

    if (cfg.defaultSessionId) return cfg.defaultSessionId;

    const sessions = await this.client.listSessions();
    const found = sessions.find((s) => s.name === cfg.defaultSessionName);
    if (found) return found.id;

    throw new OpenWaError('SESSION_NOT_FOUND', `No se encontró sesión con nombre "${cfg.defaultSessionName}" en OpenWA.`);
  }

  private fallbackResult(input: SendTextMessageInput, code: string, message: string): SendTextMessageResult {
    return {
      provider: 'openwa',
      success: false,
      status: 'failed',
      errorCode: code,
      errorMessage: message,
      fallbackUrl: buildWhatsAppUrl(input.to, input.text),
    };
  }

  async sendTextMessage(input: SendTextMessageInput): Promise<SendTextMessageResult> {
    if (!this.client) {
      return this.fallbackResult(input, 'OPENWA_NOT_CONFIGURED', openWaErrorCodeToUserMessage('OPENWA_NOT_CONFIGURED'));
    }

    let chatId: string;
    try {
      chatId = normalizePhoneToOpenWaChatId(input.to);
    } catch (err) {
      const msg = err instanceof OpenWaError ? err.message : 'Número inválido.';
      return this.fallbackResult(input, 'INVALID_PHONE', msg);
    }

    let sessionId: string;
    try {
      sessionId = await this.resolveSessionId();
    } catch (err) {
      const code = err instanceof OpenWaError ? err.code : 'OPENWA_UNKNOWN_ERROR';
      const msg  = err instanceof OpenWaError ? openWaErrorCodeToUserMessage(err.code) : 'No se pudo resolver la sesión.';
      console.error('[openwa] resolveSessionId error:', code);
      return this.fallbackResult(input, code, msg);
    }

    try {
      const res = await this.client.sendText(sessionId, chatId, input.text);
      const externalId = res.id ?? res.messageId ?? '';
      return {
        provider: 'openwa',
        success: true,
        messageId: externalId,
        externalMessageId: externalId,
        status: 'sent',
        raw: res,
      };
    } catch (err) {
      if (err instanceof OpenWaError) {
        console.error('[openwa] sendText error:', err.code, err.message);
        return this.fallbackResult(input, err.code, openWaErrorCodeToUserMessage(err.code));
      }
      console.error('[openwa] sendText unexpected error:', err);
      return this.fallbackResult(input, 'OPENWA_UNKNOWN_ERROR', openWaErrorCodeToUserMessage('OPENWA_UNKNOWN_ERROR'));
    }
  }

  async getSessionStatus(): Promise<WhatsAppSessionInfo> {
    if (!this.client) {
      return { provider: 'openwa', status: 'not_configured', errorMessage: 'Configura OPENWA_BASE_URL y OPENWA_API_KEY.' };
    }

    let session: OpenWaSession;
    try {
      const sessionId = await this.resolveSessionId();
      session = await this.client.getSession(sessionId);
    } catch (err) {
      if (err instanceof OpenWaError && err.code === 'SESSION_NOT_FOUND') {
        return { provider: 'openwa', status: 'not_configured', errorMessage: 'No se encontró sesión activa en OpenWA.' };
      }
      if (err instanceof OpenWaError && err.code === 'OPENWA_UNREACHABLE') {
        return { provider: 'openwa', status: 'failed', errorMessage: 'OpenWA no está disponible. Revisa el servicio.' };
      }
      if (err instanceof OpenWaError) {
        return { provider: 'openwa', status: 'failed', errorMessage: err.message };
      }
      return { provider: 'openwa', status: 'failed', errorMessage: 'Error desconocido.' };
    }

    return {
      provider: 'openwa',
      status: mapSessionStatus(session.status),
      sessionId: session.id,
      phoneNumber: session.phoneNumber,
      connectedAt: session.connectedAt,
      raw: session,
    };
  }

  async getQrCode(): Promise<WhatsAppSessionInfo> {
    if (!this.client) {
      return { provider: 'openwa', status: 'not_configured', errorMessage: 'OpenWA no está configurado.' };
    }

    let sessionId: string;
    try {
      sessionId = await this.resolveSessionId();
    } catch {
      return { provider: 'openwa', status: 'not_configured', errorMessage: 'No se encontró sesión de OpenWA.' };
    }

    try {
      const qr = await this.client.getQr(sessionId);
      return {
        provider: 'openwa',
        status: 'scan_qr',
        sessionId,
        qrImage: qr.image,
        qrCode: qr.code,
      };
    } catch (err) {
      const msg = err instanceof OpenWaError ? err.message : 'No se pudo obtener el QR.';
      return { provider: 'openwa', status: 'failed', errorMessage: msg };
    }
  }

  async validateWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
    const { verifyOpenWaSignature } = await import('../webhook/verify-openwa-signature');
    const cfg = getOpenWaConfig();
    if (!cfg?.webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[openwa] OPENWA_WEBHOOK_SECRET no configurado en producción. Rechazando webhook.');
        return false;
      }
      console.warn('[openwa] OPENWA_WEBHOOK_SECRET no configurado. Webhook aceptado en desarrollo.');
      return true;
    }
    return verifyOpenWaSignature(rawBody, signature, cfg.webhookSecret);
  }

  async normalizeIncomingWebhook(
    payload: unknown
  ): Promise<NormalizedIncomingWhatsAppMessage | null> {
    const { normalizeOpenWaWebhook } = await import('../webhook/normalize-openwa-webhook');
    return normalizeOpenWaWebhook(payload);
  }
}
