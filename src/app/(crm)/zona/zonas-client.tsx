"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { deleteZonaAction, deleteSectorAction } from "@/app/actions/security";
import DeleteConfirmationDialog from "@/components/ui/delete-confirmation-dialog";
import { useToast, Toaster } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase-browser";

type Sector = {
  id: number;
  numero: number;
  fincas: Array<{
    id: number;
    propiedades: Array<{ id: number }>;
  }>;
};

type Zona = {
  id: number;
  nombre: string;
  sectores: Sector[];
};

type DeleteTarget =
  | { kind: "zona"; id: number }
  | { kind: "sector"; id: number; zonaId: number };

export default function ZonasClient({
  initialZonas,
  canDeleteZonas,
  canDeleteSectores,
}: {
  initialZonas: Zona[];
  canDeleteZonas: boolean;
  canDeleteSectores: boolean;
}) {
  const [zonas, setZonas] = useState<Zona[]>(initialZonas);
  const [openIds, setOpenIds] = useState<Set<number>>(
    () => new Set(initialZonas.map((z) => z.id)) // todas abiertas por defecto
  );

  // Modal nueva zona
  const [zonaModalOpen, setZonaModalOpen] = useState(false);
  const [zonaName, setZonaName] = useState("");
  const [savingZona, setSavingZona] = useState(false);

  // Modal nuevo sector
  const [sectorModal, setSectorModal] = useState<{ zonaId: number } | null>(null);
  const [sectorNumero, setSectorNumero] = useState("");
  const [savingSector, setSavingSector] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toasts, toast } = useToast();

  // ── Toggle acordeón ──────────────────────────────────────────────────────
  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Crear zona ───────────────────────────────────────────────────────────
  async function handleCreateZona() {
    if (!zonaName.trim()) return;
    setSavingZona(true);
    const { data, error } = await supabase
      .from("zona")
      .insert({ nombre: zonaName.trim() })
      .select("id, nombre, sectores(id, numero, fincas(id, propiedades(id)))")
      .single();
    if (error) {
      toast(`Error: ${error.message}`, "error");
    } else if (data) {
      setZonas((prev) =>
        [...prev, data as Zona].sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setOpenIds((prev) => new Set([...prev, (data as Zona).id]));
      toast("Zona creada");
    }
    setZonaName("");
    setSavingZona(false);
    setZonaModalOpen(false);
  }

  // ── Crear sector ─────────────────────────────────────────────────────────
  async function handleCreateSector() {
    if (!sectorModal || !sectorNumero.trim()) return;
    const num = parseInt(sectorNumero, 10);
    if (isNaN(num)) return;
    setSavingSector(true);
    const { data, error } = await supabase
      .from("sectores")
      .insert({ numero: num, zona_id: sectorModal.zonaId })
      .select("id, numero, fincas(id, propiedades(id))")
      .single();
    if (error) {
      toast(`Error: ${error.message}`, "error");
    } else if (data) {
      setZonas((prev) =>
        prev.map((z) =>
          z.id === sectorModal.zonaId
            ? {
                ...z,
                sectores: [...z.sectores, data as Sector].sort(
                  (a, b) => a.numero - b.numero
                ),
              }
            : z
        )
      );
      toast("Sector creado");
    }
    setSectorNumero("");
    setSavingSector(false);
    setSectorModal(null);
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    if (deleteTarget.kind === "zona") {
      const result = await deleteZonaAction({
        zonaId: deleteTarget.id,
        password: deletePassword,
      });
      if (result.error) {
        setDeleteError(result.error);
        setDeleting(false);
        return;
      }
      setZonas((prev) => prev.filter((z) => z.id !== deleteTarget.id));
      toast("Zona eliminada");
    } else {
      const result = await deleteSectorAction({
        sectorId: deleteTarget.id,
        password: deletePassword,
      });
      if (result.error) {
        setDeleteError(result.error);
        setDeleting(false);
        return;
      }
      setZonas((prev) =>
        prev.map((z) =>
          z.id === deleteTarget.zonaId
            ? { ...z, sectores: z.sectores.filter((s) => s.id !== deleteTarget.id) }
            : z
        )
      );
      toast("Sector eliminado");
    }

    setDeleting(false);
    setDeleteTarget(null);
    setDeletePassword("");
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Cabecera */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Zona / Sectores</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {zonas.length} {zonas.length === 1 ? "zona" : "zonas"} ·{" "}
            {zonas.reduce((acc, z) => acc + z.sectores.length, 0)} sectores en total
          </p>
        </div>
        {canDeleteZonas && (
          <button
            onClick={() => { setZonaModalOpen(true); setZonaName(""); }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nueva zona
          </button>
        )}
      </div>

      {zonas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-20 text-center">
          <p className="font-medium text-text-primary">No hay zonas todavía</p>
          <p className="mt-1 text-sm text-text-secondary">Crea la primera zona para empezar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {zonas.map((zona) => {
            const isOpen = openIds.has(zona.id);
            const totalFincas = zona.sectores.reduce(
              (acc, s) => acc + (s.fincas?.length ?? 0),
              0
            );
            const totalPropiedades = zona.sectores.reduce(
              (acc, s) =>
                acc +
                (s.fincas?.reduce(
                  (fa, f) => fa + (f.propiedades?.length ?? 0),
                  0
                ) ?? 0),
              0
            );

            return (
              <div
                key={zona.id}
                className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
              >
                {/* ── Cabecera zona ── */}
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    onClick={() => toggle(zona.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                    <span className="text-base font-semibold text-text-primary">
                      {zona.nombre}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span className="rounded-full bg-background px-2 py-0.5">
                        {zona.sectores.length} sectores
                      </span>
                      <span className="rounded-full bg-background px-2 py-0.5">
                        {totalFincas} fincas
                      </span>
                      <span className="rounded-full bg-background px-2 py-0.5">
                        {totalPropiedades} propiedades
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSectorModal({ zonaId: zona.id }); setSectorNumero(""); }}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Sector
                    </button>
                    {canDeleteZonas && (
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setDeletePassword("");
                          setDeleteTarget({ kind: "zona", id: zona.id });
                        }}
                        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-red-50 hover:text-danger"
                        title="Eliminar zona"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Sectores ── */}
                {isOpen && (
                  <div className="border-t border-border">
                    {zona.sectores.length === 0 ? (
                      <p className="px-12 py-6 text-sm italic text-text-secondary">
                        Esta zona no tiene sectores todavía.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-background">
                            <th className="px-12 py-2.5 text-left text-xs font-medium text-text-secondary">
                              Sector
                            </th>
                            <th className="w-28 px-4 py-2.5 text-center text-xs font-medium text-text-secondary">
                              Fincas
                            </th>
                            <th className="w-28 px-4 py-2.5 text-center text-xs font-medium text-text-secondary">
                              Propiedades
                            </th>
                            <th className="w-10 px-4 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {zona.sectores.map((sector) => {
                            const fincaCount = sector.fincas?.length ?? 0;
                            const propCount =
                              sector.fincas?.reduce(
                                (acc, f) => acc + (f.propiedades?.length ?? 0),
                                0
                              ) ?? 0;

                            return (
                              <tr
                                key={sector.id}
                                onClick={() =>
                                  router.push(`/zona/${zona.id}/sector/${sector.id}`)
                                }
                                className="group cursor-pointer transition-colors hover:bg-background"
                              >
                                <td className="px-12 py-3 font-medium text-text-primary">
                                  Sector {sector.numero}
                                </td>
                                <td className="w-28 px-4 py-3 text-center text-text-secondary">
                                  {fincaCount}
                                </td>
                                <td className="w-28 px-4 py-3 text-center text-text-secondary">
                                  {propCount}
                                </td>
                                <td className="w-10 px-4 py-3 text-right">
                                  {canDeleteSectores && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteError(null);
                                        setDeletePassword("");
                                        setDeleteTarget({
                                          kind: "sector",
                                          id: sector.id,
                                          zonaId: zona.id,
                                        });
                                      }}
                                      className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-danger group-hover:opacity-100"
                                      title="Eliminar sector"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal nueva zona ── */}
      {zonaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Nueva zona</h2>
              <button onClick={() => setZonaModalOpen(false)} className="text-text-secondary hover:text-text-primary">×</button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-text-secondary">Nombre de la zona</label>
              <input
                type="text"
                value={zonaName}
                onChange={(e) => setZonaName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateZona()}
                placeholder="Ej: Zona Norte"
                className="input mt-1.5"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setZonaModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
              <button onClick={handleCreateZona} disabled={savingZona || !zonaName.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {savingZona ? "Creando..." : "Crear zona"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nuevo sector ── */}
      {sectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">Nuevo sector</h2>
              <button onClick={() => setSectorModal(null)} className="text-text-secondary hover:text-text-primary">×</button>
            </div>
            <div className="px-6 py-5">
              <label className="text-xs font-medium text-text-secondary">Número de sector</label>
              <input
                type="number"
                value={sectorNumero}
                onChange={(e) => setSectorNumero(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateSector()}
                placeholder="Ej: 23"
                min={1}
                className="input mt-1.5"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={() => setSectorModal(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background">Cancelar</button>
              <button onClick={handleCreateSector} disabled={savingSector || !sectorNumero.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {savingSector ? "Creando..." : "Crear sector"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ── */}
      {deleteTarget && (
        <DeleteConfirmationDialog
          title={deleteTarget.kind === "zona" ? "Eliminar zona" : "Eliminar sector"}
          description={
            deleteTarget.kind === "zona"
              ? "Se eliminarán todos los sectores, fincas y propiedades asociadas."
              : "Se eliminarán todas las fincas y propiedades asociadas."
          }
          password={deletePassword}
          error={deleteError}
          pending={deleting}
          onPasswordChange={setDeletePassword}
          onCancel={() => { setDeleteTarget(null); setDeletePassword(""); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
