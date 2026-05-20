export type OpenWaErrorCode =
  | 'INVALID_PHONE'
  | 'NUMBER_NOT_ON_WHATSAPP'
  | 'SESSION_NOT_READY'
  | 'SESSION_DISCONNECTED'
  | 'SESSION_NOT_FOUND'
  | 'OPENWA_UNAUTHORIZED'
  | 'OPENWA_FORBIDDEN'
  | 'RATE_LIMITED'
  | 'OPENWA_TIMEOUT'
  | 'OPENWA_UNREACHABLE'
  | 'OPENWA_NOT_CONFIGURED'
  | 'OPENWA_UNKNOWN_ERROR';

export class OpenWaError extends Error {
  constructor(
    public readonly code: OpenWaErrorCode,
    message: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = 'OpenWaError';
  }
}

export function openWaErrorFromHttpStatus(status: number, body: unknown): OpenWaError {
  const b = body as Record<string, unknown> | null;
  const errCode = typeof b?.error === 'string' ? b.error : null;

  if (status === 401) return new OpenWaError('OPENWA_UNAUTHORIZED', 'OpenWA: no autorizado. Revisa OPENWA_API_KEY.', body);
  if (status === 403) return new OpenWaError('OPENWA_FORBIDDEN', 'OpenWA: acceso denegado.', body);
  if (status === 429) return new OpenWaError('RATE_LIMITED', 'OpenWA: límite de peticiones superado.', body);

  if (errCode === 'MESSAGE_INVALID_CHAT_ID') return new OpenWaError('INVALID_PHONE', 'ID de chat inválido para WhatsApp.', body);
  if (errCode === 'MESSAGE_NUMBER_NOT_ON_WHATSAPP') return new OpenWaError('NUMBER_NOT_ON_WHATSAPP', 'El número no tiene WhatsApp activo.', body);
  if (errCode === 'SESSION_NOT_READY') return new OpenWaError('SESSION_NOT_READY', 'La sesión de WhatsApp no está lista.', body);
  if (errCode === 'SESSION_DISCONNECTED') return new OpenWaError('SESSION_DISCONNECTED', 'La sesión de WhatsApp está desconectada.', body);
  if (errCode === 'MESSAGE_RATE_LIMITED') return new OpenWaError('RATE_LIMITED', 'Límite de mensajes de WhatsApp superado.', body);

  return new OpenWaError('OPENWA_UNKNOWN_ERROR', `Error HTTP ${status} de OpenWA.`, body);
}

export function openWaErrorCodeToUserMessage(code: OpenWaErrorCode): string {
  const messages: Record<OpenWaErrorCode, string> = {
    INVALID_PHONE:               'El número de teléfono no es válido para WhatsApp.',
    NUMBER_NOT_ON_WHATSAPP:      'El número no tiene WhatsApp activo.',
    SESSION_NOT_READY:           'La sesión de WhatsApp no está conectada. Contacta al administrador.',
    SESSION_DISCONNECTED:        'WhatsApp se ha desconectado. Contacta al administrador.',
    SESSION_NOT_FOUND:           'No se encontró la sesión de WhatsApp.',
    OPENWA_UNAUTHORIZED:         'Error de autenticación con WhatsApp.',
    OPENWA_FORBIDDEN:            'Sin permiso para esta operación de WhatsApp.',
    RATE_LIMITED:                'Demasiados mensajes enviados. Espera unos minutos.',
    OPENWA_TIMEOUT:              'WhatsApp tardó demasiado en responder.',
    OPENWA_UNREACHABLE:          'No se puede conectar con WhatsApp en este momento.',
    OPENWA_NOT_CONFIGURED:       'WhatsApp (OpenWA) no está configurado.',
    OPENWA_UNKNOWN_ERROR:        'Error inesperado al enviar por WhatsApp.',
  };
  return messages[code] ?? 'Error al enviar por WhatsApp.';
}
