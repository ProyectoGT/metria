// GET /api/whatsapp/session/status
// Devuelve el estado de la sesión del proveedor activo.
// Todos los usuarios autenticados pueden ver el estado básico.

import { NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/current-user';
import { getWhatsAppProvider } from '@/lib/whatsapp/provider-factory';

export async function GET() {
  const yo = await getCurrentUserContext();
  if (!yo) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const provider = getWhatsAppProvider();

  if (!provider.getSessionStatus) {
    return NextResponse.json({
      provider: provider.name,
      status: 'not_configured',
      canManageSession: false,
    });
  }

  const info = await provider.getSessionStatus();
  const canManageSession = yo.role === 'Administrador';

  return NextResponse.json({
    provider: info.provider,
    status: info.status,
    phoneNumber: info.phoneNumber ?? null,
    connectedAt: info.connectedAt ?? null,
    sessionId: canManageSession ? (info.sessionId ?? null) : null,
    errorMessage: info.errorMessage ?? null,
    canManageSession,
  });
}
