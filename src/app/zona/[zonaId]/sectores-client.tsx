"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useToast, Toaster } from "@/components/ui/toast";

type Sector = {
  id: number;
  numero: number;
  fincas: Array<{
    id: number;
    propiedades: Array<{ id: number }>;
  }>;
};

type Props = {
  zonaId: number;
  zonaNombre: string;
  initialSectores: Sector[];
};

export default function SectoresClient({ zonaId, zonaNombre, initialSectores }: Props) {
  const [sectores, setSectores] = useState<Sector[]>(initialSectores);
  const [modalOpen, setModalOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toasts, toast } = useToast();

  async function handleCreate() {
    const num = parseInt(numero);
    if (!num || isNaN(num)) return;
    setSaving(true);
    const { data, error: err } = await supabase
      .from("sectores")
      .insert({ numero: num, zona_id: zonaId })
      .select("id, numero, fincas(id, propiedades(id))")
      .single();
    if (err) {
      toast("Error al crear el sector: " + err.message, "error");
    } else if (data) {
      setSectores((prev) => [...prev, data as Sector].sort((a, b) => a.numero - b.numero));
      toast("Sector creado correctamente");
    }
    setNumero("");
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    setError(null);
    const { error: err } = await supabase.from("sectores").delete().eq("id", deleteId);
    if (err) {
      setError("No se puede eliminar: tiene fincas o propiedades asociadas.");
      setDeleting(false);
      return;
    }
    setSectores((prev) => prev.filter((s) => s.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);
    toast("Sector eliminado");
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Zonas", href: "/zona" },
          { label: zonaNombre },
        ]}
      />

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/zona")}
            className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
            title="Volver a zonas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{zonaNombre}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {sectores.length} {sectores.length === 1 ? "sector" : "sectores"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setModalOpen(true); setNumero(""); }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nuevo sector
        </button>
      </div>

      {/* List */}
      {sectores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">No hay sectores todavía</p>
          <p className="mt-1 text-sm text-text-secondary">Añade el primer sector a esta zona</p>
          <button
            onClick={() => { setModalOpen(true); setNumero(""); }}
            className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nuevo sector
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-5 py-3 text-left font-medium text-text-secondary">Sector</th>
                <th className="w-32 px-5 py-3 text-center font-medium text-text-secondary">Fincas</th>
                <th className="w-32 px-5 py-3 text-center font-medium text-text-secondary">Propiedades</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sectores.map((sector) => {
                const fincaCount = sector.fincas?.length ?? 0;
                const propiedadCount = sector.fincas?.reduce((acc, f) => acc + (f.propiedades?.length ?? 0), 0) ?? 0;

                return (
                  <tr
                    key={sector.id}
                    onClick={() => router.push(`/zona/${zonaId}/sector/${sector.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-background"
                  >
                    <td className="px-5 py-3.5 font-medium text-text-primary">Sector {sector.numero}</td>
                    <td className="w-32 px-5 py-3.5 text-center text-text-secondary">{fincaCount}</td>
                    <td className="w-32 px-5 py-3.5 text-center text-text-secondary">{propiedadCount}</td>
                    <td className="w-12 px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setError(null); setDeleteId(sector.id); }}
                        className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-danger group-hover:opacity-100"
                        title="Eliminar sector"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Nuevo sector</h2>
              <button onClick={() => setModalOpen(false)} className="text-text-secondary transition-colors hover:text-text-primary">✕</button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-text-secondary">Número de sector</label>
              <input
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Ej: 12"
                min={1}
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
                disabled={saving || !numero.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear sector"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">Eliminar sector</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Se eliminarán todas las fincas y propiedades asociadas. Esta acción no se puede deshacer.
            </p>
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{error}</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setDeleteId(null); setError(null); }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
