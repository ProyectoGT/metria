"use server";

import { getCurrentUserContext } from "@/lib/current-user";
import { canSetVendido } from "@/lib/roles";
import { createClient } from "@/lib/supabase";

export type PropertySaleInput = {
  soldAt: string;
  salePrice?: number | null;
  commissionAmount?: number | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  notes?: string | null;
};

export type PropertyStatusTransitionResult = {
  data?: Record<string, unknown>;
  error?: string;
};

type RpcError = {
  message: string;
};

type CommercialCycleRpcClient = {
  rpc: (
    functionName: "transition_propiedad_commercial_status",
    args: {
      p_propiedad_id: number;
      p_next_status: string;
      p_notes: string | null;
      p_sold_at: string | null;
      p_sale_price: number | null;
      p_commission_amount: number | null;
      p_buyer_name: string | null;
      p_buyer_phone: string | null;
    }
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

const SOLD_STATUS = "vendido";

function asCommercialCycleRpcClient(client: unknown): CommercialCycleRpcClient {
  return client as CommercialCycleRpcClient;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function getPropertyAccessContext(propiedadId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("propiedades")
    .select("id, estado, agente_asignado")
    .eq("id", propiedadId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Propiedad no encontrada o sin acceso." };
  return { data };
}

async function transitionPropertyCommercialStatus(
  propiedadId: number,
  nextStatus: string,
  input?: { notes?: string | null; sale?: PropertySaleInput }
): Promise<PropertyStatusTransitionResult> {
  const supabase = await createClient();
  const rpc = asCommercialCycleRpcClient(supabase);
  const sale = input?.sale;

  const { data, error } = await rpc.rpc("transition_propiedad_commercial_status", {
    p_propiedad_id: propiedadId,
    p_next_status: nextStatus,
    p_notes: normalizeOptionalText(sale?.notes ?? input?.notes),
    p_sold_at: sale?.soldAt ?? null,
    p_sale_price: sale?.salePrice ?? null,
    p_commission_amount: sale?.commissionAmount ?? null,
    p_buyer_name: normalizeOptionalText(sale?.buyerName),
    p_buyer_phone: normalizeOptionalText(sale?.buyerPhone),
  });

  if (error) return { error: error.message };
  return { data: data as Record<string, unknown> };
}

export async function markPropertySoldAction(
  propiedadId: number,
  sale: PropertySaleInput
): Promise<PropertyStatusTransitionResult> {
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };
  if (!sale.soldAt) return { error: "Indica la fecha de venta." };

  const access = await getPropertyAccessContext(propiedadId);
  if (access.error) return { error: access.error };
  if (!access.data) return { error: "Propiedad no encontrada o sin acceso." };

  if (!canSetVendido(yo.role, access.data.agente_asignado, yo.id, yo.supervisedAgentIds)) {
    return { error: "No tienes permiso para marcar esta propiedad como vendida." };
  }

  return transitionPropertyCommercialStatus(propiedadId, SOLD_STATUS, { sale });
}

export async function reopenPropertyCycleAction(
  propiedadId: number,
  nextStatus: string,
  notes?: string | null
): Promise<PropertyStatusTransitionResult> {
  if (nextStatus === SOLD_STATUS) return { error: "Usa la accion de venta para marcar una propiedad como vendida." };
  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };

  return transitionPropertyCommercialStatus(propiedadId, nextStatus, { notes });
}

export async function changePropertyStatusAction(
  propiedadId: number,
  nextStatus: string,
  options?: { sale?: PropertySaleInput; notes?: string | null }
): Promise<PropertyStatusTransitionResult> {
  if (nextStatus === SOLD_STATUS) {
    if (!options?.sale) return { error: "Completa los datos de venta antes de marcar la propiedad como vendida." };
    return markPropertySoldAction(propiedadId, options.sale);
  }

  const yo = await getCurrentUserContext();
  if (!yo) return { error: "No autenticado" };

  return transitionPropertyCommercialStatus(propiedadId, nextStatus, { notes: options?.notes });
}
