import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectableType =
  | "kanban-card"
  | "ticket"
  | "propiedad"
  | "pedido"
  | "contacto"
  | "zona-geografica"
  | null;

interface UIState {
  // ── Sidebar (mobile) ──────────────────────────────────────────────────────
  sidebarOpen:    boolean;
  openSidebar:    () => void;
  closeSidebar:   () => void;
  toggleSidebar:  () => void;

  // ── Side panel ────────────────────────────────────────────────────────────
  // id of the currently open side panel (e.g. "kanban-detail", "ticket-detail")
  activePanelId:  string | null;
  openPanel:      (id: string) => void;
  closePanel:     () => void;

  // ── Current selection ─────────────────────────────────────────────────────
  // A single selected entity that a side panel or drawer responds to.
  selectedType:   SelectableType;
  selectedId:     number | null;
  setSelected:    (type: NonNullable<SelectableType>, id: number) => void;
  clearSelected:  () => void;

  // ── Modals ────────────────────────────────────────────────────────────────
  // We track a Set of open modal ids so multiple non-overlapping modals work.
  openModalIds:   Set<string>;
  openModal:      (id: string) => void;
  closeModal:     (id: string) => void;
  isModalOpen:    (id: string) => boolean;
  closeAllModals: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // ── Sidebar ─────────────────────────────────────────────────────────────
    sidebarOpen:   false,
    openSidebar:   () => set({ sidebarOpen: true }),
    closeSidebar:  () => set({ sidebarOpen: false }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    // ── Side panel ──────────────────────────────────────────────────────────
    activePanelId: null,
    openPanel:     (id) => set({ activePanelId: id }),
    closePanel:    () => set({ activePanelId: null }),

    // ── Selection ───────────────────────────────────────────────────────────
    selectedType:  null,
    selectedId:    null,
    setSelected:   (type, id) => set({ selectedType: type, selectedId: id }),
    clearSelected: () => set({ selectedType: null, selectedId: null }),

    // ── Modals ──────────────────────────────────────────────────────────────
    openModalIds:   new Set(),
    openModal:      (id) =>
      set((s) => ({ openModalIds: new Set([...s.openModalIds, id]) })),
    closeModal:     (id) =>
      set((s) => {
        const next = new Set(s.openModalIds);
        next.delete(id);
        return { openModalIds: next };
      }),
    isModalOpen:    (id) => get().openModalIds.has(id),
    closeAllModals: () => set({ openModalIds: new Set() }),
  }))
);

// ─── Convenience selectors ────────────────────────────────────────────────────

export const selectSidebarOpen  = (s: UIState) => s.sidebarOpen;
export const selectActivePanelId = (s: UIState) => s.activePanelId;
export const selectSelected     = (s: UIState) => ({
  type: s.selectedType,
  id:   s.selectedId,
});
