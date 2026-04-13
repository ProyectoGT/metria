import Image from "next/image";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-5">
          <Image
            src="/logo-metria.crm.png"
            alt="Metria CRM"
            width={80}
            height={80}
            priority
          />
          <p className="text-sm text-text-secondary">
            Accede a tu cuenta del CRM
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
