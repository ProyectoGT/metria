import { logout } from "@/app/(auth)/actions";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
          <svg
            className="h-7 w-7 text-danger"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-text-primary">
          Acceso no autorizado
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Tu cuenta de correo no está registrada en el sistema. Contacta con el
          administrador para que te den de alta.
        </p>

        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Cerrar sesión y volver al inicio
          </button>
        </form>
      </div>
    </div>
  );
}
