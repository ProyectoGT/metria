export type WhatsAppProviderName = 'manual' | 'meta' | 'openwa';

export type WhatsAppMessageStatus =
  | 'draft'
  | 'prepared'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'unknown';

export type WhatsAppSessionStatus =
  | 'not_configured'
  | 'initializing'
  | 'scan_qr'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface SendTextMessageInput {
  to: string;
  text: string;
  recipientName?: string;
  pedidoId?: number;
  propiedadId?: number;
  relatedType?: 'solicitud' | 'propiedad';
  relatedId?: number;
  templateName?: string;
}

export interface SendTextMessageResult {
  provider: WhatsAppProviderName;
  success: boolean;
  messageId?: string;
  externalMessageId?: string;
  status: WhatsAppMessageStatus;
  fallbackUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
}

export interface WhatsAppSessionInfo {
  provider: WhatsAppProviderName;
  status: WhatsAppSessionStatus;
  sessionId?: string;
  phoneNumber?: string;
  qrImage?: string;
  qrCode?: string;
  connectedAt?: string;
  errorMessage?: string;
  raw?: unknown;
}

export interface NormalizedIncomingWhatsAppMessage {
  provider: WhatsAppProviderName;
  eventId: string;
  idempotencyKey: string;
  sessionId?: string;
  externalMessageId: string;
  from: string;
  to?: string;
  body?: string;
  type: string;
  direction: 'inbound';
  timestamp: string;
  waTimestamp?: number;
  isGroup?: boolean;
  hasMedia?: boolean;
  contactName?: string;
  raw: unknown;
}

export interface WhatsAppProviderCapabilities {
  automaticSend: boolean;
  qr: boolean;
  webhooks: boolean;
  sessions: boolean;
}

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  sendTextMessage(input: SendTextMessageInput): Promise<SendTextMessageResult>;
  getSessionStatus?(): Promise<WhatsAppSessionInfo>;
  getQrCode?(): Promise<WhatsAppSessionInfo>;
  normalizeIncomingWebhook?(
    payload: unknown,
    headers?: Record<string, string>
  ): Promise<NormalizedIncomingWhatsAppMessage | null>;
  validateWebhookSignature?(rawBody: string, signature: string | null): Promise<boolean>;
  getCapabilities(): WhatsAppProviderCapabilities;
}
