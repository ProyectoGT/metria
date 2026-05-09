"use client";

/**
 * Typed selector hooks for the UI Zustand store.
 *
 * Why: calling `useUIStore()` without a selector subscribes to the ENTIRE
 * store — any state change causes a re-render even if the component only
 * uses `sidebarOpen`. These hooks subscribe to specific slices so components
 * only re-render when their relevant piece of state changes.
 *
 * Usage:
 *   const open    = useSidebarOpen();
 *   const toggle  = useSidebarToggle();
 *   const panelId = useActivePanelId();
 */

import { useUIStore } from "@/stores/ui.store";

// ── Sidebar ───────────────────────────────────────────────────────────────────
export const useSidebarOpen   = () => useUIStore((s) => s.sidebarOpen);
export const useSidebarToggle = () => useUIStore((s) => s.toggleSidebar);
export const useOpenSidebar   = () => useUIStore((s) => s.openSidebar);
export const useCloseSidebar  = () => useUIStore((s) => s.closeSidebar);

// ── Panel ─────────────────────────────────────────────────────────────────────
export const useActivePanelId = () => useUIStore((s) => s.activePanelId);
export const useOpenPanel     = () => useUIStore((s) => s.openPanel);
export const useClosePanel    = () => useUIStore((s) => s.closePanel);

// ── Selection ─────────────────────────────────────────────────────────────────
export const useSelectedId    = () => useUIStore((s) => s.selectedId);
export const useSelectedType  = () => useUIStore((s) => s.selectedType);
export const useSetSelected   = () => useUIStore((s) => s.setSelected);
export const useClearSelected = () => useUIStore((s) => s.clearSelected);

// ── Modals ────────────────────────────────────────────────────────────────────
export const useOpenModal     = () => useUIStore((s) => s.openModal);
export const useCloseModal    = () => useUIStore((s) => s.closeModal);
export const useCloseAllModals = () => useUIStore((s) => s.closeAllModals);
/** Returns whether a specific modal id is open. Memoized by id. */
export const useIsModalOpen   = (id: string) => useUIStore((s) => s.openModalIds.has(id));
