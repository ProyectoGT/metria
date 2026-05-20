"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Laptop, ShieldCheck } from "lucide-react";
import { useToast, Toaster } from "@/components/ui/toast";
import Drawer from "@/components/ui/drawer";
import type { UserDevice } from "../types";
import {
  revokeMyDeviceSession,
  trustMyDevice,
  untrustMyDevice,
  updateMyDeviceAlias,
} from "../actions";
import DeviceCard from "./DeviceCard";
import EditDeviceAliasDialog from "./EditDeviceAliasDialog";

type Props = {
  devices: UserDevice[];
};

export default function UserDevicesPage({ devices }: Props) {
  const router = useRouter();
  const { toasts, toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editingDevice, setEditingDevice] = useState<UserDevice | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<UserDevice | null>(null);

  const activeDevices = useMemo(
    () => devices.filter((device) => !device.revokedAt),
    [devices]
  );
  const trustedDevices = useMemo(
    () => devices.filter((device) => device.trustedAt && !device.revokedAt),
    [devices]
  );
  const unknownDevices = activeDevices.length - trustedDevices.length;

  function runAction(action: () => Promise<{ ok: boolean; error?: string; signedOut?: boolean }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast(result.error ?? "No se pudo completar la accion.", "error");
        return;
      }
      toast(success);
      if (result.signedOut) {
        router.push("/login");
        return;
      }
      router.refresh();
    });
  }

  async function handleAliasSave(deviceId: number, alias: string) {
    const result = await updateMyDeviceAlias(deviceId, alias);
    if (!result.ok) throw new Error(result.error ?? "No se pudo guardar el alias.");
    toast("Alias actualizado");
    router.refresh();
  }

  return (
    <>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-5 md:p-6">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Seguridad de cuenta
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                Mis dispositivos
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                Consulta y gestiona los dispositivos desde los que has iniciado sesion en Metria.
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
                Marca tus dispositivos habituales como de confianza y cierra sesiones que ya no utilices.
              </p>
            </div>

            <div className="border-t border-border bg-background/45 p-5 lg:border-l lg:border-t-0">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Resumen
              </p>
              <div className="grid gap-2">
                <SummaryTile label="Activos" value={activeDevices.length} tone="primary" />
                <SummaryTile label="De confianza" value={trustedDevices.length} tone="success" />
                <SummaryTile label="No verificados" value={unknownDevices} tone="warning" />
              </div>
            </div>
          </div>
        </section>

        {devices.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-surface py-16 text-center shadow-sm">
            <Laptop className="mx-auto mb-3 h-10 w-10 text-text-secondary opacity-40" />
            <p className="text-sm font-medium text-text-primary">
              Aun no hay dispositivos registrados
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              El dispositivo actual se registrara automaticamente al iniciar sesion.
            </p>
          </section>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                busy={isPending}
                onEditAlias={setEditingDevice}
                onTrust={(deviceId) =>
                  runAction(() => trustMyDevice(deviceId), "Dispositivo marcado como de confianza")
                }
                onUntrust={(deviceId) =>
                  runAction(() => untrustMyDevice(deviceId), "Confianza retirada")
                }
                onRevoke={setConfirmRevoke}
              />
            ))}
          </div>
        )}
      </div>

      <EditDeviceAliasDialog
        key={editingDevice?.id ?? "new"}
        open={Boolean(editingDevice)}
        initialAlias={editingDevice?.alias ?? ""}
        onClose={() => setEditingDevice(null)}
        onSave={(alias) => {
          if (!editingDevice) return Promise.resolve();
          return handleAliasSave(editingDevice.id, alias);
        }}
      />

      {confirmRevoke && (
        <Drawer
          open={true}
          onClose={() => setConfirmRevoke(null)}
          width="sm"
          title={confirmRevoke.isCurrent ? "Cerrar sesion actual" : "Cerrar sesion"}
        >
          <div className="space-y-4 px-6 py-5">
            <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  {confirmRevoke.isCurrent
                    ? "Estas a punto de cerrar la sesion de este dispositivo."
                    : "Esta accion marcara el dispositivo como revocado."}
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  {confirmRevoke.isCurrent
                    ? "Tendras que volver a iniciar sesion para continuar usando Metria en este navegador."
                    : "La integracion con revocacion granular de sesiones queda preparada; en esta fase se registra el estado revocado de forma segura."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => setConfirmRevoke(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const device = confirmRevoke;
                setConfirmRevoke(null);
                runAction(
                  () => revokeMyDeviceSession(device.id),
                  device.isCurrent ? "Sesion cerrada" : "Dispositivo revocado"
                );
              }}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              Confirmar
            </button>
          </div>
        </Drawer>
      )}

      <Toaster toasts={toasts} />
    </>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/8 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-amber-500/10 text-amber-600",
  }[tone];

  return (
    <div className={`rounded-xl border border-border/60 px-4 py-3 ${toneClass}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
