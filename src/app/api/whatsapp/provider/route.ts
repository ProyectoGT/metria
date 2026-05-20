// GET /api/whatsapp/provider
// Devuelve información del proveedor activo y sus capacidades.
// No devuelve secretos ni API keys.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getWhatsAppProviderInfo } from '@/lib/whatsapp/provider-factory';

export async function GET() {
  // Requiere sesión activa
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const info = getWhatsAppProviderInfo();

  return NextResponse.json({
    provider: info.providerName,
    label: info.label,
    configured: info.isAutomatic,
    capabilities: info.capabilities,
  });
}
