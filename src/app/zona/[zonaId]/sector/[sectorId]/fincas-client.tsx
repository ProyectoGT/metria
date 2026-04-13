"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import Breadcrumb from "@/components/ui/breadcrumb";

type Finca = {
  id: number;
  numero: number;
  propiedades: Array<{ id: number }>;
};

type Props = {
  zonaId: number;
  zonaNombre: string;
  sectorId: number;
  sectorNumero: number;
  initialFincas: Finca[];
};

export default function FincasClient({
  zonaId,
  zonaNombre,
  sectorId,
  sectorNumero,
  initialFincas,
}: Props) {
  const [fincas, setFincas] = useState<Finca[]>(initialFincas);
  const [modalOpen, setModalOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  async function handleCreate() {
    const num = parseInt(numero);
    if (!num || isNaN(num)) return;
    setSaving(true);
    const { data } = await supabase
      .from("fincas")
      .insert({ numero: num, sector_id: sectorId })
      .select("id, numero, propiedades(id)")
      .single();
    if (data) {
      setFincas((prev) => [...prev, data as Finca].sort((a, b) => a.numero - b.numero));
    }
    setNumero("");
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    setError(null);
    const { error: err } = await supabase.from("fincas").delete().eq("id", deleteId);
    if (err) {
      setError("No se puede eliminar: tiene propiedades asociadas.");
      setDeleting(false);
      return;
    }
    setFincas((prev) => prev.filter((f) => f.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Zonas", href: "/zona" },
          { label: zonaNombre, href: `/zona/${zonaId}` },
          { label: `Sector ${sectorNumero}` },
        ]}
      />

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sector {sectorNumero}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {fincas.length} {fincas.length === 1 ? "finca" : "fincas"} en este sector
          </p>
        </div>
        <button
          onClick={() => { setModalOpen(true); setNumero(""); }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Nueva finca
        </button>
      </div>

      {/* Grid */}
      {fincas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="text-base font-medium text-text-primary">No hay fincas todavía</p>
          <p className="mt-1 text-sm text-text-secondary">Añade la primera finca a este sector</p>
          <button
            onClick={() => { setModalOpen(true); setNumero(""); }}
            className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nueva finca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {fincas.map((finca) => {
            const propiedadCount = finca.propiedades?.length ?? 0;

            return (
              <div
                key={finca.id}
                className="group relative rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-primary hover:shadow-md"
              >
                <Link href={`/zona/${zonaId}/sector/${sectorId}/finca/${finca.id}`} className="block">
                  <h3 className="text-base font-semibold text-text-primary transition-colors group-hover:text-primary">
                    Finca {finca.numero}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">{propiedadCount}</span>{" "}
                    {propiedadCount === 1 ? "propiedad" : "propiedades"}
                  </p>
                </Link>
                <button
                  onClick={() => { setError(null); setDeleteId(finca.id); }}
                  className="absolute right-2 top-2 rounded-md p-1.5 text-text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-danger group-hover:opacity-100"
                  title="Eliminar finca"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Nueva finca</h2>
              <button onClick={() => setModalOpen(false)} className="text-text-secondary transition-colors hover:text-text-primary">✕</button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-text-secondary">Número de finca</label>
              <input
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Ej: 105"
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
                {saving ? "Creando..." : "Crear finca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-base font-semibold text-text-primary">Eliminar finca</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Se eliminarán todas las propiedades asociadas. Esta acción no se puede deshacer.
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
    </>
  );
}
