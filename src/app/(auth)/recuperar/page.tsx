import AuthShell from "@/components/auth/auth-shell";
import RecuperarForm from "./recuperar-form";

export default function RecuperarPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Introduce tu correo y te enviaremos un enlace para restablecer tu acceso."
    >
      <RecuperarForm />
    </AuthShell>
  );
}
