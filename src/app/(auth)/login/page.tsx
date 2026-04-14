import AuthShell from "@/components/auth/auth-shell";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Bienvenido"
      description="Inicia sesión para acceder a la plataforma de Master Iberica."
    >
      <LoginForm />
    </AuthShell>
  );
}
