// GET /api/whatsapp/session/qr
// Devuelve el código QR para conectar la sesión de OpenWA.
// Solo accesible para Administrador.
// Cache-Control: no-store para evitar cachear QR sensibles.

import { NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/current-user';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider-factory';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET() {
  const yo = await getCurrentUserContext();
  if (!yo) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: NO_CACHE });
  }

  if (yo.role !== 'Administrador') {
    return NextResponse.json(
      { error: 'Solo los administradores pueden ver el código QR de WhatsApp.' },
      { status: 403, headers: NO_CACHE }
    );
  }

  const provider = getWhatsAppProvider();

  if (provider.name !== 'openwa') {
    return NextResponse.json(
      { error: `El proveedor "${provider.name}" no usa código QR.` },
      { status: 400, headers: NO_CACHE }
    );
  }

  if (!provider.getQrCode) {
    return NextResponse.json(
      { error: 'El proveedor no soporta QR.' },
      { status: 501, headers: NO_CACHE }
    );
  }

  const qrInfo = await provider.getQrCode();

  return NextResponse.json(
    {
      provider: qrInfo.provider,
      status: qrInfo.status,
      qrImage: qrInfo.qrImage ?? null,
      qrCode: qrInfo.qrCode ?? null,
      sessionId: qrInfo.sessionId ?? null,
      errorMessage: qrInfo.errorMessage ?? null,
    },
    { headers: NO_CACHE }
  );
}
