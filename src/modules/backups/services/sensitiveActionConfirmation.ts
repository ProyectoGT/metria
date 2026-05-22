import type { CurrentUserContext } from "@/lib/current-user";

type SensitiveActionInput = {
  user: CurrentUserContext;
  confirmationText: string;
  expectedText?: string;
};

export async function requireSensitiveActionConfirmation({
  user,
  confirmationText,
  expectedText = "CONFIRMAR",
}: SensitiveActionInput): Promise<void> {
  const normalized = confirmationText.trim().toUpperCase();
  if (normalized !== expectedText) {
    throw new Error(`Escribe ${expectedText} para confirmar esta accion sensible.`);
  }

  // Extension point: wire Supabase MFA / password reauthentication here when
  // the existing security module exposes a stable server-side API for it.
  if (!user.authId) {
    throw new Error("No se ha podido validar la sesion actual para esta accion sensible.");
  }
}
