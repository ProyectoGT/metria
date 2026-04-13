import Image from "next/image";
import RecuperarForm from "./recuperar-form";

export default function RecuperarPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo-metria.webp"
            alt="Metria CRM"
            width={60}
            height={60}
            priority
          />
          <h1 className="text-lg font-bold text-text-primary">
            Recuperar contraseña
          </h1>
          <p className="text-center text-sm text-text-secondary">
            Introduce tu correo y te enviaremos un enlace para restablecer tu
            contraseña
          </p>
        </div>
        <RecuperarForm />
      </div>
    </div>
  );
}
