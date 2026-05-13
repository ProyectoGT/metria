"use client";

/**
 * Fine-grained selector hooks for the UI Zustand store.
 *
 * Do not call useUIStore() without a selector in components. These hooks keep
 * modal/sidebar/search changes from re-rendering unrelated dashboard sections.
 */

import { useUIStore } from "@/stores/ui.store";

// Sidebar
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useSidebarToggle = () => useUIStore((state) => state.toggleSidebar);
export const useOpenSidebar = () => useUIStore((state) => state.openSidebar);
export const useCloseSidebar = () => useUIStore((state) => state.closeSidebar);

// Side panel
export const useActivePanelId = () => useUIStore((state) => state.activePanelId);
export const useOpenPanel = () => useUIStore((state) => state.openPanel);
export const useClosePanel = () => useUIStore((state) => state.closePanel);

// Selected entity identity
export const useSelectedId = () => useUIStore((state) => state.selectedId);
export const useSelectedType = () => useUIStore((state) => state.selectedType);
export const useSetSelected = () => useUIStore((state) => state.setSelected);
export const useClearSelected = () => useUIStore((state) => state.clearSelected);

// Drawers
export const useActiveDrawer = () => useUIStore((state) => state.activeDrawer);
export const useOpenDrawer = () => useUIStore((state) => state.openDrawer);
export const useCloseDrawer = () => useUIStore((state) => state.closeDrawer);

// Modals
export const useOpenModal = () => useUIStore((state) => state.openModal);
export const useCloseModal = () => useUIStore((state) => state.closeModal);
export const useCloseAllModals = () => useUIStore((state) => state.closeAllModals);
export const useIsModalOpen = (id: string) => useUIStore((state) => state.openModalIds.has(id));

// Spotlight / global search
export const useSpotlightOpen = () => useUIStore((state) => state.spotlightOpen);
export const useOpenSpotlight = () => useUIStore((state) => state.openSpotlight);
export const useCloseSpotlight = () => useUIStore((state) => state.closeSpotlight);
export const useSetSpotlightOpen = () => useUIStore((state) => state.setSpotlightOpen);
export const useToggleSpotlight = () => useUIStore((state) => state.toggleSpotlight);

// Calendar view preference
export const useCalendarViewMode = () => useUIStore((state) => state.calendarViewMode);
export const useSetCalendarViewMode = () => useUIStore((state) => state.setCalendarViewMode);
