export type PasswordRule = {
  id: string;
  label: string;
  test: (p: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { id: "lower",  label: "Al menos una minúscula (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "upper",  label: "Al menos una mayúscula (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "Al menos un número (0-9)", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "Al menos un símbolo (!@#$...)", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

/** Returns the first failing rule message, or null if valid. */
export function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label;
  }
  return null;
}

/** Returns true only if all rules pass. */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
