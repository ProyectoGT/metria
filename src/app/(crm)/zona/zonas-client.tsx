"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2, ShieldCheck, X, Loader2 } from "lucide-react";
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

type UsuarioAcceso = { id: number; nombre: string; apellidos: string; rol: string };

export default function ZonasClient({
  initialZonas,
  canDeleteZonas,
  canDeleteSectores,
  canManageAccess = false,
  usuarios = [],
  initialAccesos = [],
}: {
  initialZonas: Zona[];
  canDeleteZonas: boolean;
  canDeleteSectores: boolean;
  canManageAccess?: boolean;
  usuarios?: UsuarioAcceso[];
  initialAccesos?: { zona_id: number; usuario_id: number }[];
}) {
  const [zonas, setZonas] = useState<Zona[]>(initialZonas);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());

  // Accesos: mapa zona_id → Set<usuario_id>
  const [accesos, setAccesos] = useState<Map<number, Set<number>>>(() => {
    const m = new Map<number, Set<number>>();
    for (const a of initialAccesos) {
      if (!m.has(a.zona_id)) m.set(a.zona_id, new Set());
      m.get(a.zona_id)!.add(a.usuario_id);
    }
    return m;
  });
  const [accesoModal, setAccesoModal] = useState<{ zonaId: number; zonaNombre: string } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  // ── Toggle acceso usuario/zona ───────────────────────────────────────────
  async function handleToggleAcceso(zonaId: number, usuarioId: number) {
    setTogglingId(usuarioId);
    const tieneAcceso = accesos.get(zonaId)?.has(usuarioId) ?? false;

    if (tieneAcceso) {
      const { error } = await supabase
        .from("zona_acceso")
        .delete()
        .eq("zona_id", zonaId)
        .eq("usuario_id", usuarioId);
      if (error) { toast(`Error: ${error.message}`, "error"); }
      else {
        setAccesos((prev) => {
          const next = new Map(prev);
          next.get(zonaId)?.delete(usuarioId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("zona_acceso")
        .insert({ zona_id: zonaId, usuario_id: usuarioId });
      if (error) { toast(`Error: ${error.message}`, "error"); }
      else {
        setAccesos((prev) => {
          const next = new Map(prev);
          if (!next.has(zonaId)) next.set(zonaId, new Set());
          next.get(zonaId)!.add(usuarioId);
          return next;
        });
      }
    }
    setTogglingId(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Cabecera */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark sm:w-auto"
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
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <button
                    onClick={() => toggle(zona.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left sm:items-center"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                    <span className="min-w-0 break-words text-base font-semibold text-text-primary">
                      {zona.nombre}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary sm:gap-3">
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
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {canManageAccess && usuarios.length > 0 && (
                      <button
                        onClick={() => setAccesoModal({ zonaId: zona.id, zonaNombre: zona.nombre })}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                        title="Gestionar acceso de usuarios"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Acceso
                        {(accesos.get(zona.id)?.size ?? 0) > 0 && (
                          <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                            {accesos.get(zona.id)?.size}
                          </span>
                        )}
                      </button>
                    )}
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
                        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
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
                      <p className="px-4 py-6 text-sm italic text-text-secondary sm:px-12">
                        Esta zona no tiene sectores todavía.
                      </p>
                    ) : (
                      <>
                      <div className="divide-y divide-border md:hidden">
                        {zona.sectores.map((sector) => {
                          const fincaCount = sector.fincas?.length ?? 0;
                          const propCount =
                            sector.fincas?.reduce(
                              (acc, f) => acc + (f.propiedades?.length ?? 0),
                              0
                            ) ?? 0;

                          return (
                            <div
                              key={sector.id}
                              onClick={() => router.push(`/zona/${zona.id}/sector/${sector.id}`)}
                              className="cursor-pointer px-4 py-3 transition-colors hover:bg-background"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-text-primary">
                                    Sector {sector.numero}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-secondary">
                                    <span className="rounded-full bg-background px-2 py-0.5">
                                      {fincaCount} fincas
                                    </span>
                                    <span className="rounded-full bg-background px-2 py-0.5">
                                      {propCount} propiedades
                                    </span>
                                  </div>
                                </div>
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
                                    className="rounded p-1 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                                    title="Eliminar sector"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <table className="hidden w-full min-w-[560px] text-sm md:table">
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
                                      className="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
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
                      </>
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

      {/* ── Modal gestión de accesos ── */}
      {accesoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Acceso a {accesoModal.zonaNombre}
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Elige quién puede ver esta zona
                </p>
              </div>
              <button
                onClick={() => setAccesoModal(null)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-background hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {usuarios.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-secondary">
                  No hay Responsables ni Agentes activos
                </p>
              ) : (
                <div className="space-y-1">
                  {/* Agrupar por rol */}
                  {(["Responsable", "Agente"] as const).map((rol) => {
                    const grupo = usuarios.filter((u) => u.rol === rol);
                    if (grupo.length === 0) return null;
                    return (
                      <div key={rol}>
                        <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-text-secondary first:mt-0">
                          {rol}s
                        </p>
                        {grupo.map((u) => {
                          const tiene = accesos.get(accesoModal.zonaId)?.has(u.id) ?? false;
                          const toggling = togglingId === u.id;
                          const initials = `${u.nombre[0]}${u.apellidos[0]}`.toUpperCase();
                          return (
                            <div
                              key={u.id}
                              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-background"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-text-primary">
                                  {u.nombre} {u.apellidos}
                                </p>
                                <p className="text-xs text-text-secondary">{u.rol}</p>
                              </div>
                              <button
                                onClick={() => handleToggleAcceso(accesoModal.zonaId, u.id)}
                                disabled={toggling}
                                className={[
                                  "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none disabled:opacity-60",
                                  tiene ? "bg-primary" : "bg-border",
                                ].join(" ")}
                                title={tiene ? "Quitar acceso" : "Dar acceso"}
                              >
                                {toggling ? (
                                  <Loader2 className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                                ) : (
                                  <span
                                    className={[
                                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                                      tiene ? "left-[22px]" : "left-0.5",
                                    ].join(" ")}
                                  />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border px-6 py-3 text-xs text-text-secondary">
              Los usuarios sin acceso asignado no podran ver ninguna zona.
            </div>
          </div>
        </div>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}
