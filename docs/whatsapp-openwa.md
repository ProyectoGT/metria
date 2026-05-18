# WhatsApp en Metria — Guía de integración con OpenWA

## Índice

1. [Arquitectura de proveedores](#1-arquitectura-de-proveedores)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Instalar y levantar OpenWA en local](#3-instalar-y-levantar-openwa-en-local)
4. [Obtener la API key de OpenWA](#4-obtener-la-api-key-de-openwa)
5. [Crear y conectar la sesión (QR)](#5-crear-y-conectar-la-sesión-qr)
6. [Configurar el webhook en OpenWA](#6-configurar-el-webhook-en-openwa)
7. [Probar envío de mensajes](#7-probar-envío-de-mensajes)
8. [Probar recepción (webhook inbound)](#8-probar-recepción-webhook-inbound)
9. [Swagger y Dashboard de OpenWA](#9-swagger-y-dashboard-de-openwa)
10. [Panel de sesión en Metria](#10-panel-de-sesión-en-metria)
11. [Base de datos](#11-base-de-datos)
12. [Riesgos y limitaciones](#12-riesgos-y-limitaciones)
13. [Troubleshooting](#13-troubleshooting)
14. [Recomendaciones de producción](#14-recomendaciones-de-producción)

---

## 1. Arquitectura de proveedores

Metria soporta tres modos de WhatsApp, elegibles por variable de entorno sin tocar código:

| Proveedor | Variable | Descripción |
|-----------|----------|-------------|
| `manual`  | `WHATSAPP_PROVIDER=manual` | Abre `wa.me` en el navegador. Sin envío automático. **Defecto.** |
| `meta`    | `WHATSAPP_PROVIDER=meta`   | WhatsApp Cloud API oficial de Meta (requiere cuenta business verificada). |
| `openwa`  | `WHATSAPP_PROVIDER=openwa` | OpenWA self-hosted. Sesiones basadas en WhatsApp Web. |

El sistema tiene **fallback automático** al proveedor `manual` si el proveedor configurado no está disponible o no responde.

### Estructura del código

```
src/lib/whatsapp/
  types.ts                   # Interfaces comunes (WhatsAppProvider, SendTextMessageResult, ...)
  config.ts                  # Lectura de env vars (getActiveWhatsAppProviderName, getOpenWaConfig, ...)
  errors.ts                  # Tipos de error OpenWA (OpenWaError, openWaErrorCodeToUserMessage)
  provider-factory.ts        # getWhatsAppProvider() — instancia el proveedor activo
  providers/
    manual-provider.ts       # Genera URLs wa.me
    meta-provider.ts         # Envuelve whatsapp-api.ts (Meta Cloud API)
    openwa-client.ts         # Cliente HTTP para la API REST de OpenWA
    openwa-provider.ts       # Proveedor OpenWA completo (send, session, QR, webhook)
  webhook/
    verify-openwa-signature.ts   # HMAC-SHA256 del header x-openwa-signature
    normalize-openwa-webhook.ts  # Convierte payload OpenWA → NormalizedIncomingWhatsAppMessage
    process-openwa-event.ts      # Idempotencia, dispatch, persistencia de eventos
```

### Archivos no modificados (backward compat)

- `src/lib/whatsapp.ts` — Utilidades wa.me y plantillas (sin cambios)
- `src/lib/whatsapp-api.ts` — Meta Cloud API (sin cambios, envuelto por MetaProvider)
- `src/app/api/whatsapp/webhook/route.ts` — Webhook de Meta (sin cambios)
- Todos los componentes React (`WhatsAppMessageModal`, `BuyerMatcherModal`, etc.)

---

## 2. Variables de entorno

Añade a tu `.env.local` (ver `.env.local.example` para la plantilla completa):

```bash
# Proveedor activo
WHATSAPP_PROVIDER=openwa          # manual | meta | openwa
WHATSAPP_FALLBACK_PROVIDER=manual # fallback si el principal falla

# OpenWA
OPENWA_BASE_URL=http://localhost:2785/api
OPENWA_API_KEY=<copia desde el dashboard de OpenWA>
OPENWA_DEFAULT_SESSION_NAME=metria-main
OPENWA_DEFAULT_SESSION_ID=        # opcional: ID exacto de la sesión (se descubre por nombre si está vacío)
OPENWA_WEBHOOK_SECRET=<secreto compartido para firmar webhooks>
OPENWA_TIMEOUT_MS=10000
```

> **Nunca** incluyas `OPENWA_API_KEY` ni `OPENWA_WEBHOOK_SECRET` en el bundle del cliente.
> Estas variables no tienen prefijo `NEXT_PUBLIC_` intencionalmente.

---

## 3. Instalar y levantar OpenWA en local

```bash
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA
docker compose up -d
```

Servicios que arranca:

| Servicio  | URL                            | Descripción               |
|-----------|-------------------------------|---------------------------|
| API REST  | http://localhost:2785/api      | Endpoints principales      |
| Swagger   | http://localhost:2785/api/docs | Documentación interactiva  |
| Dashboard | http://localhost:2886          | Panel web de gestión       |

Verifica que la API responde:

```bash
curl http://localhost:2785/api/sessions
```

---

## 4. Obtener la API key de OpenWA

1. Abre el Dashboard: http://localhost:2886
2. En la sección de configuración o autenticación, copia la API key generada.
3. Pégala en `OPENWA_API_KEY` en tu `.env.local`.

Alternativa vía Swagger (http://localhost:2785/api/docs): usa el botón **Authorize** e introduce la key.

---

## 5. Crear y conectar la sesión (QR)

### Opción A — Desde el Dashboard de OpenWA

1. Abre http://localhost:2886
2. Crea una nueva sesión con nombre `metria-main` (igual que `OPENWA_DEFAULT_SESSION_NAME`).
3. Escanea el QR con WhatsApp en tu móvil (WhatsApp → Tres puntos → Dispositivos vinculados → Vincular un dispositivo).

### Opción B — Desde Metria (solo Administrador)

1. Inicia sesión en Metria como Administrador.
2. Navega a **Cuenta** o al panel de administración de WhatsApp.
3. El indicador de estado mostrará el QR si la sesión está en `scan_qr`.
4. Escanea el QR.

> El QR solo es visible para usuarios con rol **Administrador**. Los agentes no pueden verlo.

### Opción C — API directa

```bash
# Crear sesión
curl -X POST http://localhost:2785/api/sessions \
  -H "X-API-Key: TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "metria-main"}'

# Ver QR (esperar hasta status=SCAN_QR)
curl http://localhost:2785/api/sessions/SESSION_ID/qr \
  -H "X-API-Key: TU_API_KEY"
```

Una vez conectada, copia el `id` de la sesión y pégalo en `OPENWA_DEFAULT_SESSION_ID`.

---

## 6. Configurar el webhook en OpenWA

OpenWA necesita saber a dónde enviar los eventos.

### URL del webhook de Metria

```
https://tu-dominio.com/api/whatsapp/webhook/openwa
```

En local con túnel (usando [ngrok](https://ngrok.com/) o [localtunnel](https://theboroer.github.io/localtunnel-www/)):

```bash
ngrok http 3000
# Copia la URL: https://xxxx.ngrok-free.app
```

### Registrar el webhook en OpenWA

```bash
curl -X POST http://localhost:2785/api/sessions/SESSION_ID/webhooks \
  -H "X-API-Key: TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://xxxx.ngrok-free.app/api/whatsapp/webhook/openwa",
    "events": ["message.received", "message.sent", "message.ack", "session.status"],
    "secret": "TU_OPENWA_WEBHOOK_SECRET"
  }'
```

El `secret` debe coincidir con `OPENWA_WEBHOOK_SECRET` en `.env.local`.

---

## 7. Probar envío de mensajes

### Desde la UI de Metria

1. Abre una solicitud o propiedad.
2. Click en "Enviar WhatsApp".
3. Si `WHATSAPP_PROVIDER=openwa` y la sesión está conectada → el mensaje se envía automáticamente.
4. Si falla → aparece el botón "Abrir WhatsApp" con el enlace wa.me de fallback.

### Vía API interna (para tests)

```bash
curl -X POST http://localhost:3000/api/whatsapp/messages/send \
  -H "Cookie: <cookie de sesión de Metria>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+34600111222",
    "text": "Hola, mensaje de prueba desde Metria.",
    "pedidoId": 123
  }'
```

Respuesta esperada (éxito):

```json
{
  "success": true,
  "provider": "openwa",
  "messageId": "msg_XXXX",
  "status": "sent",
  "fallbackUrl": null
}
```

Respuesta con sesión no conectada:

```json
{
  "success": false,
  "provider": "openwa",
  "status": "failed",
  "errorCode": "SESSION_NOT_READY",
  "errorMessage": "La sesión de WhatsApp no está conectada. Contacta al administrador.",
  "fallbackUrl": "https://wa.me/34600111222?text=..."
}
```

---

## 8. Probar recepción (webhook inbound)

Simula un webhook de OpenWA con firma válida:

```bash
# Calcula firma HMAC-SHA256
SECRET="TU_OPENWA_WEBHOOK_SECRET"
PAYLOAD='{"event":"message.received","idempotencyKey":"test-001","session":{"id":"SESSION_ID"},"data":{"id":"MSG_001","from":"34600111222@c.us","body":"Hola respuesta","type":"text","timestamp":1716000000}}'
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print "sha256="$2}')

curl -X POST http://localhost:3000/api/whatsapp/webhook/openwa \
  -H "Content-Type: application/json" \
  -H "x-openwa-signature: $SIG" \
  -d "$PAYLOAD"
```

Respuesta esperada:

```json
{ "ok": true }
```

Para duplicado (mismo `idempotencyKey`):

```json
{ "ok": true, "duplicate": true }
```

---

## 9. Swagger y Dashboard de OpenWA

- **Swagger**: http://localhost:2785/api/docs — Prueba todos los endpoints directamente.
- **Dashboard**: http://localhost:2886 — Ver sesiones, logs, QR en tiempo real.

No expongas el Dashboard públicamente en producción sin autenticación.

---

## 10. Panel de sesión en Metria

### Endpoint de estado

```
GET /api/whatsapp/session/status
```

Devuelve el estado actual de la sesión para todos los usuarios autenticados.

### Endpoint de QR

```
GET /api/whatsapp/session/qr
```

Solo accesible para **Administrador**. Devuelve el QR como base64 (`qrImage: "data:image/png;base64,..."`).

### Endpoint de proveedor

```
GET /api/whatsapp/provider
```

Información del proveedor activo y sus capacidades. No devuelve secretos.

---

## 11. Base de datos

### Tablas nuevas (migración `20260518000001`, `20260518000002`)

| Tabla | Descripción |
|-------|-------------|
| `whatsapp_sessions` | Estado de sesiones por proveedor. Actualizado por webhooks `session.status`. |
| `whatsapp_webhook_events` | Auditoría e idempotencia. Cada webhook recibido queda registrado. |

### Tablas existentes (sin cambios)

| Tabla | Descripción |
|-------|-------------|
| `whatsapp_messages` | Historial de mensajes outbound/inbound. |
| `pedidos.whatsapp_consent` | Consentimiento RGPD por pedido. |

### Aplicar migraciones

```bash
supabase db push
```

---

## 12. Riesgos y limitaciones

### Uso no oficial

OpenWA utiliza la interfaz de WhatsApp Web, **no la API oficial de Meta**. Esto implica:

- WhatsApp puede bloquear cuentas por uso automatizado (especialmente si se envían mensajes en masa).
- No está sujeto a las políticas de Meta para APIs comerciales.
- El número de teléfono conectado es un número personal o empresarial real.
- No se pueden usar plantillas aprobadas (solo mensajes libres dentro de la ventana de 24h).

### Rate limits

- El endpoint `POST /api/whatsapp/messages/send` limita a **20 mensajes por minuto por usuario** (en memoria; en producción considera Redis).
- No permite arrays de destinatarios (bloqueo anti-spam).

### QR y seguridad

- El QR equivale a vincular el número a WhatsApp Web. Nunca lo compartas.
- Solo admins de Metria pueden ver el QR (`GET /api/whatsapp/session/qr`).

### Fiabilidad de sesión

- La sesión puede desconectarse si WhatsApp detecta actividad inusual.
- En producción, configura alertas cuando `session.status = disconnected`.

---

## 13. Troubleshooting

### "OPENWA_UNREACHABLE" al enviar

- Verifica que OpenWA esté corriendo: `docker compose ps` en el directorio de OpenWA.
- Verifica que `OPENWA_BASE_URL` apunte al host correcto.

### "SESSION_NOT_FOUND"

- `OPENWA_DEFAULT_SESSION_ID` o `OPENWA_DEFAULT_SESSION_NAME` no coincide con ninguna sesión activa.
- Crea la sesión en el Dashboard y copia el ID.

### "SESSION_NOT_READY" / "SESSION_DISCONNECTED"

- La sesión existe pero no está conectada. Necesitas escanear el QR de nuevo.
- En Metria como Admin: `GET /api/whatsapp/session/qr` o panel de administración.

### "Invalid signature" en webhook

- `OPENWA_WEBHOOK_SECRET` no coincide entre Metria y la configuración del webhook en OpenWA.
- Reconfigura el webhook con el mismo secret.

### Webhook no llega a localhost

- Necesitas un túnel (ngrok, localtunnel) para que OpenWA pueda alcanzar tu máquina local.

### Mensajes duplicados

- La tabla `whatsapp_webhook_events` garantiza idempotencia por `idempotency_key`.
- Si ves duplicados, verifica que OpenWA esté enviando un `idempotencyKey` o `deliveryId` estable.

---

## 14. Recomendaciones de producción

- **HTTPS obligatorio** para el webhook.
- **`OPENWA_WEBHOOK_SECRET`** con al menos 32 caracteres aleatorios. Sin él, en producción se rechazan los webhooks.
- **API Key fuerte** (`OPENWA_API_KEY`) — usa un generador de tokens seguros.
- **No expongas** el Dashboard de OpenWA (puerto 2886) públicamente sin autenticación adicional.
- **Firewall/CIDR**: si OpenWA tiene IP fija, restringe `POST /api/whatsapp/webhook/openwa` a esa IP.
- **Backups de sesión**: si OpenWA guarda datos en volumen Docker, incluye ese volumen en los backups.
- **Alertas**: configura notificaciones cuando `session.status = disconnected` — la sesión puede caducar.
- **No uses este sistema para envíos masivos** (campañas). Usa Meta Cloud API + plantillas aprobadas.
- **Fallback siempre activo**: si OpenWA falla, el sistema devuelve un enlace `wa.me` para que el agente pueda continuar manualmente.
- **Retención de webhooks**: los eventos en `whatsapp_webhook_events` pueden crecer. Programa una limpieza periódica de registros `processed` con más de 90 días.

```sql
-- Ejemplo de limpieza (ejecutar periódicamente)
DELETE FROM whatsapp_webhook_events
WHERE created_at < NOW() - INTERVAL '90 days'
  AND status = 'processed';
```
