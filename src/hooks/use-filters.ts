"use client";

/**
 * Typed selector hooks for the filters Zustand store.
 *
 * Each hook subscribes to only the relevant slice, preventing re-renders
 * from unrelated filter changes in other modules.
 */

import { useFiltersStore } from "@/stores/filters.store";

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const useDashboardFilters      = () => useFiltersStore((s) => s.dashboard);
export const useSetDashboardFilter    = () => useFiltersStore((s) => s.setDashboardFilter);
export const useResetDashboardFilters = () => useFiltersStore((s) => s.resetDashboard);

// ── Solicitudes ───────────────────────────────────────────────────────────────
export const useSolicitudesFilters      = () => useFiltersStore((s) => s.solicitudes);
export const useSetSolicitudesFilter    = () => useFiltersStore((s) => s.setSolicitudesFilter);
export const useResetSolicitudesFilters = () => useFiltersStore((s) => s.resetSolicitudes);

// ── Propiedades ───────────────────────────────────────────────────────────────
export const usePropiedadesFilters      = () => useFiltersStore((s) => s.propiedades);
export const useSetPropiedadesFilter    = () => useFiltersStore((s) => s.setPropiedadesFilter);
export const useResetPropiedadesFilters = () => useFiltersStore((s) => s.resetPropiedades);

// ── Contactos ─────────────────────────────────────────────────────────────────
export const useContactosFilters      = () => useFiltersStore((s) => s.contactos);
export const useSetContactosFilter    = () => useFiltersStore((s) => s.setContactosFilter);
export const useResetContactosFilters = () => useFiltersStore((s) => s.resetContactos);

// ── Usuarios ──────────────────────────────────────────────────────────────────
export const useUsuariosFilters      = () => useFiltersStore((s) => s.usuarios);
export const useSetUsuariosFilter    = () => useFiltersStore((s) => s.setUsuariosFilter);
export const useResetUsuariosFilters = () => useFiltersStore((s) => s.resetUsuarios);

// ── Ordenes ───────────────────────────────────────────────────────────────────
export const useOrdenesFilters      = () => useFiltersStore((s) => s.ordenes);
export const useSetOrdenesFilter    = () => useFiltersStore((s) => s.setOrdenesFilter);
export const useResetOrdenesFilters = () => useFiltersStore((s) => s.resetOrdenes);

// ── Calendario ────────────────────────────────────────────────────────────────
export const useCalendarioFilters      = () => useFiltersStore((s) => s.calendario);
export const useSetCalendarioFilter    = () => useFiltersStore((s) => s.setCalendarioFilter);
export const useResetCalendarioFilters = () => useFiltersStore((s) => s.resetCalendario);
