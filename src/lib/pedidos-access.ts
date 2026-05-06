import { normalizeAccessScope } from "@/lib/access-scope";
import type { CurrentUserContext } from "@/lib/current-user";

export type PedidoAccessRow = {
  owner_user_id: number | null;
  empresa_id?: number | null;
  equipo_id?: number | null;
  visibility?: string | null;
  visibility_agente_ids?: number[] | null;
};

export function canReadPedido(pedido: PedidoAccessRow, user: CurrentUserContext | null) {
  if (!user) return false;

  const isSameCompany =
    pedido.empresa_id == null ||
    user.empresaId == null ||
    pedido.empresa_id === user.empresaId;
  if (!isSameCompany) return false;

  if (user.role === "Administrador" || user.role === "Director") return true;
  if (pedido.owner_user_id === user.id) return true;

  const scope = normalizeAccessScope(pedido.visibility);
  const selectedUserIds = pedido.visibility_agente_ids ?? [];

  if (scope === "private") return false;
  if (scope === "company") return true;
  if (scope === "team") {
    return (
      pedido.equipo_id != null &&
      user.equipoId != null &&
      pedido.equipo_id === user.equipoId
    );
  }
  if (scope === "agents") {
    return selectedUserIds.length === 0
      ? user.role === "Agente"
      : selectedUserIds.includes(user.id);
  }
  if (scope === "responsable") {
    return selectedUserIds.length === 0
      ? user.role === "Responsable"
      : selectedUserIds.includes(user.id);
  }

  return false;
}

export function filterReadablePedidos<T extends PedidoAccessRow>(
  pedidos: T[],
  user: CurrentUserContext | null,
) {
  return pedidos.filter((pedido) => canReadPedido(pedido, user));
}
