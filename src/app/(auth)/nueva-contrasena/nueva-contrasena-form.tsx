"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const fieldClassName =
  "w-full border-0 border-b border-[#d8d3cb] bg-transparent px-0 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#b1aba3] focus:border-[#7ba4e0] focus:ring-0";

export default function NuevaContrasenaForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-[#f2c7c7] bg-[#fff3f3] px-4 py-3 text-sm text-[#b42318]">
          {error}
        </div>
      )}

      <div className="space-y-7">
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#2f2f2f]">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-[#2f2f2f]">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            placeholder="Repite la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={fieldClassName}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full border border-[#9fc0ee] px-4 py-2.5 text-sm font-medium text-[#6f96cf] transition hover:border-[#7ba4e0] hover:text-[#5f8fd4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
