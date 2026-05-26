type SensitiveActionInput = {
  confirmationText: string;
  expectedText?: string;
};

export async function requireSensitiveActionConfirmation({
  confirmationText,
  expectedText = "CONFIRMAR",
}: SensitiveActionInput): Promise<void> {
  const normalized = confirmationText.trim().toUpperCase();
  if (normalized !== expectedText) {
    throw new Error(`Escribe ${expectedText} para confirmar esta accion sensible.`);
  }

  // authId puede ser null en algunas configuraciones de sesion — no bloquear por esto
  // ya que el texto de confirmacion es la capa de seguridad principal aqui.
}
