"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteZonaAction } from "@/app/actions/security";
import DeleteConfirmationDialog from "@/components/ui/delete-confirmation-dialog";
import { useToast, Toaster } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase-browser";

type Zona = {
  id: number;
  nombre: string;
  sectores: Array<{
    id: number;
    fincas: Array<{
      id: number;
      propiedades: Array<{ id: number }>;
    }>;
  }>;
};

export default function ZonasClient({
  initialZonas,
  canDeleteZonas,
}: {
  initialZonas: Zona[];
  canDeleteZonas: boolean;
}) {
  const [zonas, setZonas] = useState<Zona[]>(initialZonas);
  const [modalOpen, setModalOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toasts, toast } = useToast();

  async function handleCreate() {
    if (!nombre.trim()) return;

    setSaving(true);

    const { data, error: err } = await supabase
      .from("zona")
      .insert({ nombre: nombre.trim() })
      .select("*, sectores(id, fincas(id, propiedades(id)))")
      .single();

    if (err) {
      toast(`Error al crear la zona: ${err.message}`, "error");
    } else if (data) {
      setZonas((prev) =>
        [...prev, data as Zona].sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      toast("Zona creada correctamente");
    }

    setNombre("");
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;

    setDeleting(true);
    setError(null);

    const result = await deleteZonaAction({
      zonaId: deleteId,
      password: deletePassword,
    });

    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    setZonas((prev) => prev.filter((z) => z.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);
    setDeletePassword("");
    toast("Zona eliminada");
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Zonas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gestiona las zonas, sectores y fincas del CRM
          </p>
        </div>
        <button
          onClick={() => {
            setModalOpen(true);
            setNombre("");
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nueva zona
        </button>
      </div>

      {zonas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">
            No hay zonas todavía
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Crea la primera zona para empezar
          </p>
          <button
            onClick={() => {
              setModalOpen(true);
              setNombre("");
            }}
            className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nueva zona
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-5 py-3 text-left font-medium text-text-secondary">
                  Zona
                </th>
                <th className="w-32 px-5 py-3 text-center font-medium text-text-secondary">
                  Sectores
                </th>
                <th className="w-32 px-5 py-3 text-center font-medium text-text-secondary">
                  Fincas
                </th>
                <th className="w-32 px-5 py-3 text-center font-medium text-text-secondary">
                  Propiedades
                </th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zonas.map((zona) => {
                const sectorCount = zona.sectores?.length ?? 0;
                const fincaCount =
                  zona.sectores?.reduce(
                    (acc, sector) => acc + (sector.fincas?.length ?? 0),
                    0
                  ) ?? 0;
                const propiedadCount =
                  zona.sectores?.reduce(
                    (acc, sector) =>
                      acc +
                      (sector.fincas?.reduce(
                        (fincaAcc, finca) =>
                          fincaAcc + (finca.propiedades?.length ?? 0),
                        0
                      ) ?? 0),
                    0
                  ) ?? 0;

                return (
                  <tr
                    key={zona.id}
                    onClick={() => router.push(`/zona/${zona.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-background"
                  >
                    <td className="px-5 py-3.5 font-medium text-text-primary">
                      {zona.nombre}
                    </td>
                    <td className="w-32 px-5 py-3.5 text-center text-text-secondary">
                      {sectorCount}
                    </td>
                    <td className="w-32 px-5 py-3.5 text-center text-text-secondary">
                      {fincaCount}
                    </td>
                    <td className="w-32 px-5 py-3.5 text-center text-text-secondary">
                      {propiedadCount}
                    </td>
                    <td className="w-12 px-5 py-3.5 text-right">
                      {canDeleteZonas && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setError(null);
                            setDeletePassword("");
                            setDeleteId(zona.id);
                          }}
                          className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-danger group-hover:opacity-100"
                          title="Eliminar zona"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">
                Nueva zona
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-text-secondary transition-colors hover:text-text-primary"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-text-secondary">
                Nombre de la zona
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Ej: Zona Norte"
                className="input mt-1.5"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !nombre.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear zona"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <DeleteConfirmationDialog
          title="Eliminar zona"
          description="Se eliminarán todos los datos asociados, incluidos sectores, fincas y propiedades. Esta acción no se puede deshacer."
          password={deletePassword}
          error={error}
          pending={deleting}
          onPasswordChange={setDeletePassword}
          onCancel={() => {
            setDeleteId(null);
            setDeletePassword("");
            setError(null);
          }}
          onConfirm={handleDelete}
        />
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
