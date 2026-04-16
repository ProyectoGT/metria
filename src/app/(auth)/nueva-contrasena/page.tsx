import AuthShell from "@/components/auth/auth-shell";
import NuevaContrasenaForm from "./nueva-contrasena-form";

export default function NuevaContrasenaPage() {
  return (
    <AuthShell
      title="Nueva contraseña"
      description="Elige una nueva contraseña segura para tu cuenta."
    >
      <NuevaContrasenaForm />
    </AuthShell>
  );
}
