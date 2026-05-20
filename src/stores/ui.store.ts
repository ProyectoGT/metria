import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type SelectableType =
  | "kanban-card"
  | "ticket"
  | "propiedad"
  | "pedido"
  | "contacto"
  | "agenda"
  | "tarea"
  | "zona-geografica"
  | null;

export type CalendarViewMode = "month" | "week" | "day";

export type ActiveDrawer = {
  id: string;
  mode?: string;
} | null;

export interface UIState {
  // Sidebar is ephemeral UI state. It is intentionally not persisted.
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Side panel identifies the active panel, not the data rendered inside it.
  activePanelId: string | null;
  openPanel: (id: string) => void;
  closePanel: () => void;

  // Store only entity identity. Fetch entity data with TanStack Query.
  selectedType: SelectableType;
  selectedId: number | null;
  setSelected: (type: NonNullable<SelectableType>, id: number) => void;
  clearSelected: () => void;

  // Drawers and modals hold UI identity/mode only, not form payloads or rows.
  activeDrawer: ActiveDrawer;
  openDrawer: (id: string, mode?: string) => void;
  closeDrawer: () => void;

  openModalIds: Set<string>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
  closeAllModals: () => void;

  // Global search / command palette.
  spotlightOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  setSpotlightOpen: (open: boolean) => void;
  toggleSpotlight: () => void;

  // Lightweight view preference. Persistible filters live in filters.store.
  calendarViewMode: CalendarViewMode;
  setCalendarViewMode: (mode: CalendarViewMode) => void;
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    sidebarOpen: false,
    openSidebar: () => set({ sidebarOpen: true }),
    closeSidebar: () => set({ sidebarOpen: false }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    activePanelId: null,
    openPanel: (id) => set({ activePanelId: id }),
    closePanel: () => set({ activePanelId: null }),

    selectedType: null,
    selectedId: null,
    setSelected: (type, id) => set({ selectedType: type, selectedId: id }),
    clearSelected: () => set({ selectedType: null, selectedId: null }),

    activeDrawer: null,
    openDrawer: (id, mode) => set({ activeDrawer: { id, mode } }),
    closeDrawer: () => set({ activeDrawer: null }),

    openModalIds: new Set(),
    openModal: (id) => set((state) => ({ openModalIds: new Set([...state.openModalIds, id]) })),
    closeModal: (id) =>
      set((state) => {
        const next = new Set(state.openModalIds);
        next.delete(id);
        return { openModalIds: next };
      }),
    isModalOpen: (id) => get().openModalIds.has(id),
    closeAllModals: () => set({ openModalIds: new Set() }),

    spotlightOpen: false,
    openSpotlight: () => set({ spotlightOpen: true }),
    closeSpotlight: () => set({ spotlightOpen: false }),
    setSpotlightOpen: (open) => set({ spotlightOpen: open }),
    toggleSpotlight: () => set((state) => ({ spotlightOpen: !state.spotlightOpen })),

    calendarViewMode: "week",
    setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),
  })),
);

export const selectSidebarOpen = (state: UIState) => state.sidebarOpen;
export const selectActivePanelId = (state: UIState) => state.activePanelId;
export const selectActiveDrawer = (state: UIState) => state.activeDrawer;
export const selectSpotlightOpen = (state: UIState) => state.spotlightOpen;
export const selectCalendarViewMode = (state: UIState) => state.calendarViewMode;
export const selectSelected = (state: UIState) => ({
  type: state.selectedType,
  id: state.selectedId,
});
