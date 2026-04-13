import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Metria</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Accede a tu cuenta del CRM
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
