// ─── Observability ───────────────────────────────────────────────────────────
// Helfer central: logInfo, logWarn, logError, trackEvent, medición de
// rendimiento. Funciona en cliente y servidor.
//
// Modos:
//   "debug"   — console completo + localStorage ring buffer (cliente)
//   "production" — bufferiza y envía a /api/observability/log (cliente)
//                  o stdout estructurado (servidor)
//
// Uso:
//   import { logInfo, logError, trackEvent, perf } from "@/lib/observability";
//
//   logInfo("auth", "Usuario autenticado", { userId: 42 });
//   logError("db", "Fallo al insertar", err, { table: "pedidos" });
//   trackEvent("pedido_creado", { pedidoId: 1, valor: 50000 });
//   const end = perf.start("carga-propiedades");
//   // ... work ...
//   end(); // registra duración
// ─────────────────────────────────────────────────────────────────────────────

const IS_CLIENT = typeof window !== "undefined";

// ─── Types ───────────────────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
  user?: Record<string, unknown>;
  route?: string;
  action?: string;
  entity?: string;
  error?: { name: string; message: string; stack?: string };
  data?: Record<string, unknown>;
  durationMs?: number;
};

export type EventPayload = {
  name: string;
  timestamp: string;
  properties?: Record<string, unknown>;
  user?: Record<string, unknown>;
  route?: string;
};

// ─── Sensitive keys to redact ────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "password", "passwd", "secret", "token", "authorization",
  "api_key", "apiKey", "apikey", "session", "cookie", "csrf",
  "correo", "email", "telefono", "phone", "dni", "nif", "ssn",
  "credit_card", "card_number", "cvv",
]);

function redact(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/_/g, ""))) {
      safe[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      safe[key] = redact(value as Record<string, unknown>) ?? value;
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

// ─── User / route context (client) ───────────────────────────────────────────

let _userContext: Record<string, unknown> | null = null;
let _routeContext: string | undefined;

export function setObservabilityUser(user: Record<string, unknown> | null) {
  _userContext = user ? redact(user) ?? null : null;
}

export function setObservabilityRoute(route: string | undefined) {
  _routeContext = route;
}

function currentContext() {
  return {
    user: _userContext ?? undefined,
    route: _routeContext ?? (IS_CLIENT ? window.location.pathname : undefined),
  };
}

// ─── Ring buffer (client-side) ───────────────────────────────────────────────

const MAX_CLIENT_LOGS = 100;

function getClientBuffer(): LogEntry[] {
  if (!IS_CLIENT) return [];
  try {
    const raw = localStorage.getItem("metria_logs");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendToClientBuffer(entry: LogEntry) {
  if (!IS_CLIENT) return;
  try {
    const buf = getClientBuffer();
    buf.push(entry);
    if (buf.length > MAX_CLIENT_LOGS) buf.splice(0, buf.length - MAX_CLIENT_LOGS);
    localStorage.setItem("metria_logs", JSON.stringify(buf));
  } catch {
    // localStorage lleno o no disponible — ignorar
  }
}

// ─── Server-side flush (API endpoint) ────────────────────────────────────────

const _clientLogQueue: LogEntry[] = [];
const _flushTimer: { current: ReturnType<typeof setTimeout> | null } = { current: null };

function enqueueClientLog(entry: LogEntry) {
  _clientLogQueue.push(entry);
  if (_clientLogQueue.length >= 10) {
    flushClientLogs();
  } else if (!_flushTimer.current) {
    _flushTimer.current = setTimeout(flushClientLogs, 5000);
  }
}

function flushClientLogs() {
  if (_flushTimer.current) { clearTimeout(_flushTimer.current); _flushTimer.current = null; }
  const batch = _clientLogQueue.splice(0);
  if (batch.length === 0) return;

  const payload = JSON.stringify({ logs: batch });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/observability/log", payload);
  } else {
    fetch("/api/observability/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => { /* best-effort */ });
  }
}

// ─── Core log function ───────────────────────────────────────────────────────

function buildEntry(
  level: LogLevel,
  context: string,
  message: string,
  error?: unknown,
  data?: Record<string, unknown>,
): LogEntry {
  const ctx = currentContext();
  const entry: LogEntry = {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
    data: data ? redact(data) : undefined,
  };
  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  } else if (error) {
    entry.error = { name: "Unknown", message: String(error) };
  }
  return entry;
}

function writeEntry(entry: LogEntry) {
  const label = `[${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;

  switch (entry.level) {
    case "error":
      console.error(label, entry.error ?? "", entry.data ?? "");
      break;
    case "warn":
      console.warn(label, entry.data ?? "");
      break;
    default:
      console.log(label, entry.data ?? "");
  }

  if (IS_CLIENT) {
    appendToClientBuffer(entry);
    if (process.env.NODE_ENV === "production") {
      enqueueClientLog(entry);
    }
  } else {
    // Servidor: en producción el console ya va a stdout/journald
    // Opcional: escribir a tabla de logs en Supabase
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function logInfo(context: string, message: string, data?: Record<string, unknown>) {
  writeEntry(buildEntry("info", context, message, undefined, data));
}

export function logWarn(context: string, message: string, data?: Record<string, unknown>) {
  writeEntry(buildEntry("warn", context, message, undefined, data));
}

export function logError(context: string, message: string, error?: unknown, data?: Record<string, unknown>) {
  writeEntry(buildEntry("error", context, message, error, data));
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  const ctx = currentContext();
  const event: EventPayload = {
    name,
    timestamp: new Date().toISOString(),
    properties: redact(properties),
    ...ctx,
  };
  console.log(`[EVENT] ${name}`, event);

  if (IS_CLIENT && process.env.NODE_ENV === "production") {
    const payload = JSON.stringify({ events: [event] });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/observability/log", payload);
    } else {
      fetch("/api/observability/log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: payload, keepalive: true,
      }).catch(() => {});
    }
  }
}

// ─── Performance ─────────────────────────────────────────────────────────────

const _marks = new Map<string, number>();

export const perf = {
  start(label: string): () => number {
    const start = performance.now();
    _marks.set(label, start);
    return () => {
      const elapsed = performance.now() - (_marks.get(label) ?? start);
      _marks.delete(label);
      const entry = buildEntry("info", "perf", label, undefined, { durationMs: Math.round(elapsed) });
      entry.durationMs = Math.round(elapsed);
      writeEntry(entry);
      return elapsed;
    };
  },

  measure(label: string, durationMs: number) {
    const entry = buildEntry("info", "perf", label, undefined, { durationMs });
    entry.durationMs = durationMs;
    writeEntry(entry);
  },
};

// ─── Client-side global error listeners ──────────────────────────────────────

export function setupGlobalErrorListeners() {
  if (!IS_CLIENT) return;

  window.onerror = (_event, _source, _lineno, _colno, error) => {
    logError("uncaught", "Error global no capturado", error, {
      source: _source,
      line: _lineno,
      col: _colno,
    });
  };

  window.addEventListener("unhandledrejection", (event) => {
    logError("unhandledrejection", "Promesa rechazada no capturada", event.reason);
  });
}

// ─── Debug: dump logs (dev tool) ─────────────────────────────────────────────

export function dumpClientLogs(): LogEntry[] {
  return getClientBuffer();
}

export function clearClientLogs() {
  if (IS_CLIENT) {
    try { localStorage.removeItem("metria_logs"); } catch { /* ignore */ }
  }
}
