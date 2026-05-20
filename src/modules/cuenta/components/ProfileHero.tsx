"use client";

import { Mail, Shield, Circle } from "lucide-react";
import AvatarUpload from "./AvatarUpload";
import { ROL_BADGE, ESTADO_USUARIO, ESTADO_USUARIO_LABEL } from "@/lib/theme";
import type { UserRole } from "@/lib/roles";

type UserStatus = "active" | "invited" | "disabled";

type Props = {
  authUserId: string;
  fullName: string;
  email: string;
  rol: UserRole;
  avatarUrl: string | null;
  status?: UserStatus;
};

export default function ProfileHero({
  authUserId,
  fullName,
  email,
  rol,
  avatarUrl,
  status = "active",
}: Props) {
  const statusLabel = ESTADO_USUARIO_LABEL[status] ?? "Activo";
  const statusClass = ESTADO_USUARIO[status] ?? ESTADO_USUARIO.active;
  const roleClass = ROL_BADGE[rol] ?? "bg-primary/10 text-primary";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 pb-6 pt-8 sm:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <AvatarUpload
            userId={authUserId}
            userName={fullName || "Usuario"}
            initialAvatarUrl={avatarUrl}
          />

          <div className="flex min-w-0 flex-col items-center gap-2 sm:items-start">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
              {fullName || "Usuario"}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleClass}`}
              >
                <Shield className="h-3 w-3" />
                {rol}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
              >
                <Circle className="h-2 w-2 fill-current" />
                {statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
