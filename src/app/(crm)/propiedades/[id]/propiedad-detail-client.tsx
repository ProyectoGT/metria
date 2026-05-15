"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Phone,
  Star,
  User,
  XCircle,
  AlertTriangle,
  CalendarCheck,
} from "lucide-react";
import type { PropiedadDetail } from "./page";
import EncargoPanel from "@/modules/propiedades/components/EncargoPanel";
import {
  WEB_SYNC_STATUS_LABEL,
  WEB_SYNC_STATUS_COLOR,
  type WebSyncStatus,
} from "@/lib/web-sync";
import { getLabelForField } from "@/modules/propiedades/services/validate-property-for-web";
import { prepareForWebAction, updateWebPublicationAction } from "../actions";
import { useToast } from "@/components/ui/toast";
import WhatsAppMessageModal from "@/components/whatsapp/WhatsAppMessageModal";
import { buildWhatsAppMessage } from "@/lib/whatsapp";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADOS: Record<string, string> = {
  neutral: "Neutral", investigacion: "Investigacion", seguimiento: "Seguimiento",
  noticia: "Noticia", encargo: "Encargo", vendido: "Vendido",
};
const ESTADO_COLOR: Record<string, string> = {
  neutral:       "bg-surface-raised text-text-secondary",
  investigacion: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  seguimiento:   "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  noticia:       "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  encargo:       "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  vendido:       "bg-success/10 text-success",
};
const OPERACION_LABEL: Record<string, string> = {
  venta: "Venta", alquiler: "Alquiler", venta_alquiler: "Venta / Alquiler",
};

function formatPrecio(p: PropiedadDetail): string {
  const v = p.precio ?? p.honorarios;
  if (!v) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right">{value ?? "—"}</span>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-success" : score >= 50 ? "bg-amber-500" : "bg-danger";
  const label = score >= 80 ? "Ficha completa" : score >= 50 ? "Ficha parcial" : "Ficha incompleta";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <span className="text-sm font-bold text-text-primary">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Props = {
  propiedad: PropiedadDetail;
  isManager: boolean;
  zonaHref: string | null;
  backHref: string;
  agentes: Array<{ id: number; nombre: string; apellidos: string }>;
  currentUserId: number;
  currentUserName: string;
};

export default function PropiedadDetailClient({ propiedad, isManager, zonaHref, backHref, agentes, currentUserId, currentUserName }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showEncargoPanel, setShowEncargoPanel] = useState(false);
  const [encargoCycleId, setEncargoCycleId] = useState<number | null>(null);
  const [encargoReadOnly, setEncargoReadOnly] = useState(false);
  const [fichaResult, setFichaResult] = useState<{
    faltantes: string[];
    mensaje: string;
    success: boolean;
  } | null>(null);

  // Local state para cambios web inmediatos
  const [webState, setWebState] = useState({
    publicar_en_web:    propiedad.publicar_en_web,
    web_destacada:      propiedad.web_destacada,
    web_precio_visible: propiedad.web_precio_visible,
    estado_publicacion_web: propiedad.estado_publicacion_web,
  });

  function handleToggle(field: keyof typeof webState, value: boolean) {
    if (!isManager) return;
    setWebState((prev) => ({ ...prev, [field]: value }));
    startTransition(async () => {
      try {
        await updateWebPublicationAction({ propiedadId: propiedad.id, [field]: value });
        toast("Guardado");
      } catch {
        toast("Error al guardar", "error");
        setWebState((prev) => ({ ...prev, [field]: !value }));
      }
    });
  }

  function handlePrepareForWeb() {
    startTransition(async () => {
      try {
        const result = await prepareForWebAction(propiedad.id);
        setFichaResult(result);
        if (result.success) {
          setWebState((prev) => ({ ...prev, estado_publicacion_web: "lista_para_publicar" }));
          toast(result.mensaje);
        } else {
          toast(result.mensaje, "error");
        }
      } catch (e) {
        toast(e instanceof Error ? e.message : "Error", "error");
      }
    });
  }

  const estado = propiedad.estado ?? "neutral";
  const showEncargoHistory = estado === "encargo" || propiedad.has_encargo_data;
  const propertyLabel = propiedad.titulo ?? propiedad.propietario ?? `Propiedad #${propiedad.id}`;
  const hasCommercialHistory = propiedad.commercial_cycles.length > 0;

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb + acciones rápidas ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={backHref} className="flex w-fit items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-text-secondary">
            {propiedad.zona_id && (
              <Link href={`/zona/${propiedad.zona_id}`} className="hover:text-text-primary">
                {propiedad.zona_nombre ?? "Zona"}
              </Link>
            )}
            {propiedad.zona_id && propiedad.sector_id && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/zona/${propiedad.zona_id}/sector/${propiedad.sector_id}`} className="hover:text-text-primary">
                  {propiedad.sector_numero ? `Sector ${propiedad.sector_numero}` : "Sector"}
                </Link>
              </>
            )}
            {zonaHref && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link href={zonaHref} className="hover:text-text-primary">
                  {propiedad.finca_numero ? `Finca ${propiedad.finca_numero}` : "Finca"}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="max-w-[220px] truncate text-text-primary">{propertyLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {propiedad.latitud && propiedad.longitud && (
            <a
              href={`https://www.google.com/maps?q=${propiedad.latitud},${propiedad.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <MapPin className="h-3.5 w-3.5" />
              Ver en mapa
            </a>
          )}
          {zonaHref && (
            <Link
              href={zonaHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Editar en Zona
            </Link>
          )}
        </div>
      </div>

      {/* ── Grid principal ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Columna izquierda (datos) */}
        <div className="space-y-5 xl:col-span-2">
          {/* Resumen */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-text-primary">
                      {propertyLabel}
                    </h1>
                    {propiedad.web_destacada && <Star className="h-4 w-4 text-amber-500" />}
                  </div>
                  {propiedad.zona_nombre && (
                    <div className="mt-0.5 flex items-center gap-1 text-sm text-text-secondary">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {[propiedad.zona_nombre, propiedad.sector_numero ? `Sector ${propiedad.sector_numero}` : null, propiedad.finca_numero ? `Finca ${propiedad.finca_numero}` : null].filter(Boolean).join(" › ")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_COLOR[estado] ?? ESTADO_COLOR.neutral}`}>
                  {ESTADOS[estado] ?? estado}
                </span>
                {propiedad.has_sale_history && (
                  <span className="rounded-full border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Vendida anteriormente{propiedad.last_sold_at ? ` · ${formatDate(propiedad.last_sold_at)}` : ""}
                  </span>
                )}
                <span className="text-xl font-bold text-text-primary">{formatPrecio(propiedad)}</span>
                {propiedad.tipo_operacion && (
                  <span className="text-xs text-text-secondary">{OPERACION_LABEL[propiedad.tipo_operacion] ?? propiedad.tipo_operacion}</span>
                )}
              </div>
            </div>
          </div>

          {propiedad.has_sale_history && estado !== "vendido" && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
              Esta propiedad tiene un historial de venta anterior. Los datos archivados siguen disponibles en Historial comercial.
            </div>
          )}

          {/* Datos básicos */}
          <Section title="Datos basicos">
            <InfoRow label="Planta"        value={propiedad.planta} />
            <InfoRow label="Puerta"        value={propiedad.puerta} />
            <InfoRow label="Propietario"   value={propiedad.propietario} />
            <InfoRow label="Telefono" value={propiedad.telefono ? (
              <span className="flex flex-wrap items-center gap-2">
                <a href={`tel:${propiedad.telefono}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" />{propiedad.telefono}
                </a>
                <WhatsAppMessageModal
                  phone={propiedad.telefono}
                  recipientName={propiedad.propietario ?? "Propietario"}
                  initialMessage={buildWhatsAppMessage("propietario_seguimiento", {
                    nombre: propiedad.propietario ?? "Propietario",
                    agente: currentUserName,
                    zona: propiedad.zona_nombre ?? undefined,
                  })}
                  templateName="propietario_seguimiento"
                  relatedType="propiedad"
                  relatedId={propiedad.id}
                  propiedadId={propiedad.id}
                  buttonLabel="WhatsApp"
                  buttonVariant="compact"
                />
              </span>
            ) : null} />
            {(propiedad.propietario_secundario || propiedad.telefono_secundario) && (
              <>
                <InfoRow label="Segundo propietario" value={propiedad.propietario_secundario} />
                <InfoRow label="Telefono secundario" value={propiedad.telefono_secundario ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <a href={`tel:${propiedad.telefono_secundario}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" />{propiedad.telefono_secundario}
                    </a>
                    <WhatsAppMessageModal
                      phone={propiedad.telefono_secundario}
                      recipientName={propiedad.propietario_secundario ?? "Segundo propietario"}
                      initialMessage={buildWhatsAppMessage("propietario_seguimiento", {
                        nombre: propiedad.propietario_secundario ?? "Segundo propietario",
                        agente: currentUserName,
                        zona: propiedad.zona_nombre ?? undefined,
                      })}
                      templateName="propietario_seguimiento"
                      relatedType="propiedad"
                      relatedId={propiedad.id}
                      propiedadId={propiedad.id}
                      buttonLabel="WhatsApp"
                      buttonVariant="compact"
                    />
                  </span>
                ) : null} />
              </>
            )}
            <InfoRow label="Agente asignado" value={propiedad.agente_nombre} />
            <InfoRow label="Fecha de visita" value={formatDate(propiedad.fecha_visita)} />
            <InfoRow label="Contactado" value={propiedad.contactado ? "Si" : "No"} />
            <InfoRow label="Estado" value={ESTADOS[estado] ?? estado} />
            <InfoRow label="Honorarios"    value={propiedad.honorarios != null ? `${propiedad.honorarios.toLocaleString("es-ES")} €` : null} />
            <InfoRow label="Precio"        value={propiedad.precio != null ? `${propiedad.precio.toLocaleString("es-ES")} €` : null} />
            <InfoRow label="Operacion"     value={propiedad.tipo_operacion ? OPERACION_LABEL[propiedad.tipo_operacion] : null} />
            <InfoRow label="Alta"          value={formatDate(propiedad.created_at)} />
            <InfoRow label="Ultima edicion" value={formatDate(propiedad.updated_at)} />
          </Section>

          {/* Descripcion para web */}
          {propiedad.descripcion && (
            <Section title="Descripcion">
              <p className="text-sm text-text-secondary leading-relaxed">{propiedad.descripcion}</p>
            </Section>
          )}

          {/* Notas internas */}
          {propiedad.notas && (
            <Section title="Notas internas">
              <p className="text-sm text-text-secondary leading-relaxed">{propiedad.notas}</p>
            </Section>
          )}

          {/* Ubicacion */}
          <Section title="Ubicacion">
            <InfoRow label="Zona"    value={propiedad.zona_nombre} />
            <InfoRow label="Sector"  value={propiedad.sector_numero ? `Sector ${propiedad.sector_numero}` : null} />
            <InfoRow label="Finca"   value={propiedad.finca_numero ? `Finca ${propiedad.finca_numero}` : null} />
            <InfoRow label="Latitud" value={propiedad.latitud} />
            <InfoRow label="Longitud" value={propiedad.longitud} />
          </Section>

          {/* Responsabilidad */}
          <Section title="Responsabilidad">
            <div className="space-y-3">
              {propiedad.agente_nombre ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {propiedad.agente_nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{propiedad.agente_nombre}</p>
                    <p className="text-xs text-text-secondary flex items-center gap-1"><User className="h-3 w-3" /> Agente asignado</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Sin agente asignado</p>
              )}
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Creada por</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{propiedad.creador_nombre ?? "Sin creador registrado"}</p>
              </div>
            </div>
          </Section>

          {showEncargoHistory && (
            <Section
              title={estado === "encargo" ? "Informacion de encargo" : "Historial de encargo"}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setEncargoCycleId(propiedad.current_commercial_cycle_id);
                    setEncargoReadOnly(false);
                    setShowEncargoPanel(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/10"
                >
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Abrir
                </button>
              }
            >
              <div className="space-y-3">
                {estado !== "encargo" && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    Esta propiedad ya no esta marcada como encargo, pero conserva informacion historica de visitas, documentos, imagenes y notas.
                  </div>
                )}
                <p className="text-sm leading-relaxed text-text-secondary">
                  Consulta los documentos, imagenes, visitas y notas asociados a la etapa de encargo.
                </p>
              </div>
            </Section>
          )}

          {hasCommercialHistory && (
            <Section title="Historial comercial">
              <div className="space-y-3">
                {propiedad.commercial_cycles.map((cycle) => {
                  const isClosed = cycle.status === "closed";
                  return (
                    <div key={cycle.id} className="rounded-xl border border-border bg-background px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isClosed ? "bg-surface-raised text-text-secondary" : "bg-success/10 text-success"}`}>
                              {isClosed ? "Ciclo cerrado" : "Ciclo activo"}
                            </span>
                            {cycle.closed_reason && (
                              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                {cycle.closed_reason === "sold" ? "Vendida" : cycle.closed_reason}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-text-secondary">
                            Inicio: {formatDate(cycle.started_at)} · Cierre: {formatDate(cycle.closed_at)}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            Estado: {cycle.initial_status ?? "—"} → {cycle.final_status ?? (isClosed ? "—" : estado)}
                          </p>
                          {(cycle.opened_by_name || cycle.closed_by_name) && (
                            <p className="mt-1 text-xs text-text-secondary">
                              Abierto por {cycle.opened_by_name ?? "—"} · Cerrado por {cycle.closed_by_name ?? "—"}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEncargoCycleId(cycle.id);
                            setEncargoReadOnly(isClosed);
                            setShowEncargoPanel(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        >
                          Ver datos archivados
                        </button>
                      </div>
                      {cycle.sale && (
                        <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3 text-sm sm:grid-cols-2">
                          <InfoRow label="Fecha venta" value={formatDate(cycle.sale.sold_at)} />
                          <InfoRow label="Precio venta" value={formatCurrency(cycle.sale.sale_price)} />
                          <InfoRow label="Comision" value={formatCurrency(cycle.sale.commission_amount)} />
                          <InfoRow label="Comprador" value={cycle.sale.buyer_name} />
                        </div>
                      )}
                      {cycle.status_changes.length > 0 && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Cambios de estado</p>
                          <div className="space-y-1.5">
                            {cycle.status_changes.map((change) => (
                              <p key={`${cycle.id}-${change.changed_at}-${change.to_status}`} className="text-xs text-text-secondary">
                                {formatDate(change.changed_at)} · {change.from_status ?? "Inicio"} → {change.to_status}
                                {change.changed_by_name ? ` · ${change.changed_by_name}` : ""}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="mt-3 text-xs text-text-secondary">
                        Datos archivados: {cycle.counts.archivos} archivos · {cycle.counts.visitas} visitas · {cycle.counts.notas} notas
                      </p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* Columna derecha (ficha + web) */}
        <div className="space-y-5">
          {/* Calidad de ficha */}
          <Section title="Calidad de ficha">
            <div className="space-y-4">
              <ScoreBar score={propiedad.calidad_ficha_score} />

              {propiedad.ficha_completa ? (
                <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Ficha completa
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Ficha incompleta
                </div>
              )}

              {propiedad.faltantes_ficha.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Campos pendientes</p>
                  {propiedad.faltantes_ficha.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                      {getLabelForField(f)}
                    </div>
                  ))}
                </div>
              )}

              {/* Modal de resultado de preparacion */}
              {fichaResult && !fichaResult.success && fichaResult.faltantes.length > 0 && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-3">
                  <p className="mb-1.5 text-xs font-semibold text-danger flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {fichaResult.mensaje}
                  </p>
                  {fichaResult.faltantes.map((f) => (
                    <p key={f} className="text-xs text-text-secondary">· {getLabelForField(f)}</p>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Publicacion web */}
          <Section
            title="Publicacion web"
            action={
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${WEB_SYNC_STATUS_COLOR[webState.estado_publicacion_web as WebSyncStatus] ?? "bg-surface-raised text-text-secondary"}`}>
                {WEB_SYNC_STATUS_LABEL[webState.estado_publicacion_web as WebSyncStatus] ?? webState.estado_publicacion_web}
              </span>
            }
          >
            <div className="space-y-4">
              {/* Toggles */}
              {(["publicar_en_web", "web_destacada", "web_precio_visible"] as const).map((field) => {
                const labels: Record<string, string> = {
                  publicar_en_web:    "Publicar en web",
                  web_destacada:      "Destacada en web",
                  web_precio_visible: "Precio visible",
                };
                return (
                  <div key={field} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{labels[field]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle(field, !webState[field])}
                      disabled={!isManager || isPending}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${webState[field] ? "bg-primary" : "bg-border"}`}
                      aria-label={labels[field]}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${webState[field] ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                );
              })}

              {propiedad.web_ultima_sincronizacion && (
                <InfoRow label="Ultima sync" value={formatDate(propiedad.web_ultima_sincronizacion)} />
              )}
              {propiedad.web_error_sync && (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  {propiedad.web_error_sync}
                </div>
              )}

              {!isManager && (
                <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-text-secondary">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Solo administradores y directores pueden gestionar la publicacion web.
                </div>
              )}

              {isManager && (
                <button
                  type="button"
                  onClick={handlePrepareForWeb}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  <Globe className="h-4 w-4" />
                  {isPending ? "Validando..." : "Preparar para web"}
                </button>
              )}

              {fichaResult?.success && (
                <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {fichaResult.mensaje}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-text-secondary">
                <p className="font-medium text-text-primary mb-1">Sincronizacion con masteriberica.cat</p>
                Cuando se implemente, este modulo enviara los datos automaticamente al portal web corporativo.
              </div>
            </div>
          </Section>
        </div>
      </div>
      {showEncargoPanel && (
        <EncargoPanel
          propiedad={propiedad}
          agentes={agentes}
          currentUserId={currentUserId}
          cycleId={encargoCycleId}
          readOnly={encargoReadOnly}
          onClose={() => {
            setShowEncargoPanel(false);
            setEncargoCycleId(null);
            setEncargoReadOnly(false);
          }}
          onEdit={() => {
            if (zonaHref) window.location.href = zonaHref;
          }}
        />
      )}
    </div>
  );
}
