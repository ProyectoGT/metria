"use client";

import type { ReactNode } from "react";
import type { Action, Module, PermissionEntity, Role } from "./types";
import { can } from "./can";
import { mapDbRoleToCanonical } from "./role-mapping";

interface CanProps {
  action: Action;
  module: Module;
  entity?: PermissionEntity;
  role?: Role | string | null;
  userId?: number;
  teamId?: number;
  supervisedIds?: number[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({
  action,
  module,
  entity,
  role,
  userId,
  teamId,
  supervisedIds,
  fallback = null,
  children,
}: CanProps) {
  const allowed = can(
    { role: role ?? null, id: userId, equipoId: teamId, supervisedAgentIds: supervisedIds },
    action,
    module,
    entity
  );

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

interface ShowForRoleProps {
  role: Role | string | null | undefined;
  roles: (Role | string)[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function ShowForRole({
  role,
  roles,
  fallback = null,
  children,
}: ShowForRoleProps) {
  if (!role) return <>{fallback}</>;
  const canonical = mapDbRoleToCanonical(role);
  const allowed = roles.some((r) => {
    if (r === "admin") return canonical === "admin";
    if (r === "manager") return canonical === "admin" || canonical === "manager";
    if (r === "commercial") return ["admin", "manager", "commercial"].includes(canonical);
    if (r === "support") return ["admin", "manager", "commercial", "support"].includes(canonical);
    return r === canonical || r === role;
  });

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
