import { OpenWaError, openWaErrorFromHttpStatus } from '../errors';
import type { OpenWaConfig } from '../config';

export interface OpenWaSession {
  id: string;
  name: string;
  status: string;
  phoneNumber?: string;
  connectedAt?: string;
}

export interface OpenWaQr {
  image?: string;
  code?: string;
}

export interface OpenWaSendTextResponse {
  id?: string;
  messageId?: string;
  status?: string;
}

export interface OpenWaCreateSessionBody {
  name: string;
  webhook?: {
    url: string;
    events: string[];
    secret?: string;
  };
}

export class OpenWaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: OpenWaConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs;
  }

  private buildHeaders(requestId: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': this.apiKey,
      'X-Request-ID': requestId,
    };
  }

  private newRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const requestId = this.newRequestId();
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          ...this.buildHeaders(requestId),
          ...(options.headers as Record<string, string> | undefined ?? {}),
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenWaError('OPENWA_TIMEOUT', `OpenWA no respondió en ${this.timeoutMs}ms (${url})`);
      }
      throw new OpenWaError('OPENWA_UNREACHABLE', `No se pudo conectar con OpenWA: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let body: unknown = null;
      try { body = await res.json(); } catch { /* ok */ }
      throw openWaErrorFromHttpStatus(res.status, body);
    }

    try {
      return await res.json() as T;
    } catch {
      throw new OpenWaError('OPENWA_UNKNOWN_ERROR', 'Respuesta de OpenWA no es JSON válido.');
    }
  }

  async listSessions(): Promise<OpenWaSession[]> {
    const data = await this.request<OpenWaSession[] | { sessions?: OpenWaSession[] }>('/sessions');
    if (Array.isArray(data)) return data;
    return data.sessions ?? [];
  }

  async getSession(sessionId: string): Promise<OpenWaSession> {
    return this.request<OpenWaSession>(`/sessions/${sessionId}`);
  }

  async createSession(body: OpenWaCreateSessionBody): Promise<OpenWaSession> {
    return this.request<OpenWaSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async startSession(sessionId: string): Promise<OpenWaSession> {
    return this.request<OpenWaSession>(`/sessions/${sessionId}/start`, { method: 'POST' });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request<unknown>(`/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async getQr(sessionId: string): Promise<OpenWaQr> {
    return this.request<OpenWaQr>(`/sessions/${sessionId}/qr`);
  }

  async sendText(sessionId: string, chatId: string, text: string): Promise<OpenWaSendTextResponse> {
    return this.request<OpenWaSendTextResponse>(`/sessions/${sessionId}/messages/send-text`, {
      method: 'POST',
      body: JSON.stringify({ chatId, text }),
    });
  }

  async registerWebhook(sessionId: string, url: string, events: string[], secret?: string): Promise<unknown> {
    return this.request<unknown>(`/sessions/${sessionId}/webhooks`, {
      method: 'POST',
      body: JSON.stringify({ url, events, ...(secret ? { secret } : {}) }),
    });
  }

  async health(): Promise<boolean> {
    try {
      await this.request<unknown>('/sessions');
      return true;
    } catch {
      return false;
    }
  }
}
