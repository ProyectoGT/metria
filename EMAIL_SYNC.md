# Modulo de sincronizacion de email

## Arquitectura

La primera integracion es Gmail. El OAuth se ejecuta siempre en rutas server-side y los tokens se guardan cifrados en Supabase. El cliente nunca recibe `access_token` ni `refresh_token`.

El acceso a emails es privado por usuario. Las politicas RLS de `email_accounts`, `email_messages` y `email_entity_links` exigen `empresa_id = current_empresa_id()` y `user_id = current_user_id()`. Administradores, directores y responsables no ven contenido privado de otros usuarios.

## Variables de entorno

- `GOOGLE_CLIENT_ID`: cliente OAuth de Google.
- `GOOGLE_CLIENT_SECRET`: secreto OAuth de Google.
- `EMAIL_TOKEN_ENCRYPTION_KEY`: secreto estable para cifrar tokens. Debe ser largo y no cambiar una vez haya cuentas conectadas.
- `NEXT_PUBLIC_BASE_URL`: URL publica de la app para configurar redirects cuando aplique.

Redirect autorizado en Google Cloud:

```text
https://tu-dominio.com/api/email/gmail/callback
```

En local:

```text
http://localhost:3000/api/email/gmail/callback
```

Scopes usados:

- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.send`

## Tablas

- `email_accounts`: cuentas conectadas, estado, email y tokens cifrados.
- `email_messages`: correos sincronizados de entrada, enviados y archivados.
- `email_entity_links`: vinculaciones automaticas o manuales con `contacto`, `pedido`, `propiedad`, `tarea` o `lead`.
- `email_templates`: plantillas comerciales iniciales por empresa.

## Rutas nuevas

- `/cuenta`: muestra el estado y el boton `Conectar Gmail`.
- `/email`: bandeja CRM con filtros, detalle, hilos por conversacion disponible mediante `provider_thread_id`, redaccion y plantillas.
- `/api/email/gmail/auth`: inicia OAuth Gmail.
- `/api/email/gmail/callback`: guarda cuenta y tokens cifrados.
- `/api/email/gmail/disconnect`: desconecta Gmail y elimina tokens.
- `/api/email/sync`: sincroniza entrada y enviados.
- `/api/email/messages/[messageId]`: marcar como leido/no leido o archivar.
- `/api/email/send`: envio server-side desde la cuenta conectada.
- `/api/email/links`: vinculacion manual.

## Relacion automatica

La primera version usa reglas deterministicas:

- Contactos por email o telefono.
- Pedidos por referencia, telefono o nombre del cliente.
- Propiedades por propietario o telefono.
- Leads Idealista por email, telefono o referencia.

La deteccion de intencion esta preparada en `src/lib/email/rules.ts` para reglas como interesado, solicita visita, pregunta precio, no interesado, propietario y urgencia.

## Limitaciones actuales

- La sincronizacion trae los ultimos 90 dias y limita cada ejecucion a 30 emails de entrada y 20 enviados.
- No descarga adjuntos; solo detecta si existen.
- La vista de hilo usa `provider_thread_id` en datos, pero la UI inicial prioriza el detalle del mensaje seleccionado.
- La vinculacion manual requiere conocer el ID de la entidad.
- Outlook queda preparado en modelo de datos, pero no implementado.

## Como probar Gmail

1. Ejecutar la migracion `20260503000010_email_sync.sql`.
2. Configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `EMAIL_TOKEN_ENCRYPTION_KEY`.
3. En Google Cloud, habilitar Gmail API y registrar el redirect `/api/email/gmail/callback`.
4. Entrar en `/cuenta` y pulsar `Conectar Gmail`.
5. Abrir `/email` y pulsar sincronizar.
6. Probar filtros, marcar leido/no leido, archivar, vincular manualmente y enviar un email de prueba.
