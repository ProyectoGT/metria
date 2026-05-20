import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase";
import { apiSuccess, handleApiError, apiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiError(401, "UNAUTHORIZED", "No autenticado");

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id, empresa_id, rol")
      .eq("auth_id", user.id)
      .single();

    if (!usuario) return apiError(401, "UNAUTHORIZED", "Usuario no encontrado");

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");
    const entityId = url.searchParams.get("entity_id");
    const action = url.searchParams.get("action");
    const actorId = url.searchParams.get("actor_id");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size")) || 50));

    const admin = createAdminClient();

    let query = admin
      .from("audit_log")
      .select("*, actor:actor_id(id, nombre, apellidos, email)", { count: "exact" });

    query = query
      .or(`empresa_id.eq.${usuario.empresa_id},empresa_id.is.null`);

    if (entityType) query = query.eq("entity_type", entityType);
    if (entityId) query = query.eq("entity_id", entityId);
    if (action) query = query.eq("action", action);
    if (actorId) query = query.eq("actor_id", Number(actorId));
    if (fromDate) query = query.gte("created_at", fromDate);
    if (toDate) query = query.lte("created_at", toDate);

    const from = (page - 1) * pageSize;
    query = query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);

    const { data, error, count } = await query;

    if (error) return apiError(500, "INTERNAL_ERROR", error.message);

    return apiSuccess(data ?? [], {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (error) {
    console.error("[audit] Error:", error);
    return handleApiError(error);
  }
}
