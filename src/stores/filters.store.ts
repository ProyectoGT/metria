import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Per-module filter shapes ─────────────────────────────────────────────────

interface DashboardFilters {
  period:  "week" | "month" | "quarter" | "year";
  agentId: number | null;
}

interface SolicitudesFilters {
  search:         string;
  status:         string | null;
  agentId:        number | null;
  tipo:           string | null;
  modalidad:      string | null;
  origen:         string | null;
  presupuestoMin: string;
  presupuestoMax: string;
}

interface PropiedadesFilters {
  search:  string;
  estado:  string | null;
  tipo:    string | null;
  agentId: number | null;
  zonaId:  number | null;
  web:     string | null;
  ficha:   string | null;
}

interface ContactosFilters {
  search:  string;
  tipo:    string | null;
  agentId: number | null;
}

interface UsuariosFilters {
  search: string;
  rol:    string | null;
}

interface OrdenesFilters {
  date:    string; // ISO date string (YYYY-MM-DD)
  agentId: number | null;
}

interface CalendarioFilters {
  agentId:  number | null;
  viewMode: "month" | "week" | "day";
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface FiltersState {
  dashboard:   DashboardFilters;
  solicitudes: SolicitudesFilters;
  propiedades: PropiedadesFilters;
  contactos:   ContactosFilters;
  usuarios:    UsuariosFilters;
  ordenes:     OrdenesFilters;
  calendario:  CalendarioFilters;

  setDashboardFilter:   <K extends keyof DashboardFilters>  (key: K, value: DashboardFilters[K])   => void;
  setSolicitudesFilter: <K extends keyof SolicitudesFilters>(key: K, value: SolicitudesFilters[K]) => void;
  setPropiedadesFilter: <K extends keyof PropiedadesFilters>(key: K, value: PropiedadesFilters[K]) => void;
  setContactosFilter:   <K extends keyof ContactosFilters>  (key: K, value: ContactosFilters[K])   => void;
  setUsuariosFilter:    <K extends keyof UsuariosFilters>   (key: K, value: UsuariosFilters[K])    => void;
  setOrdenesFilter:     <K extends keyof OrdenesFilters>    (key: K, value: OrdenesFilters[K])     => void;
  setCalendarioFilter:  <K extends keyof CalendarioFilters> (key: K, value: CalendarioFilters[K])  => void;

  resetDashboard:   () => void;
  resetSolicitudes: () => void;
  resetPropiedades: () => void;
  resetContactos:   () => void;
  resetUsuarios:    () => void;
  resetOrdenes:     () => void;
  resetCalendario:  () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

const defaults = {
  dashboard:   { period: "month" as const, agentId: null },
  solicitudes: {
    search: "",
    status: null,
    agentId: null,
    tipo: null,
    modalidad: null,
    origen: null,
    presupuestoMin: "",
    presupuestoMax: "",
  },
  propiedades: { search: "", estado: null, tipo: null, agentId: null, zonaId: null, web: null, ficha: null },
  contactos:   { search: "", tipo: null, agentId: null },
  usuarios:    { search: "", rol: null },
  ordenes:     { date: today(), agentId: null },
  calendario:  { agentId: null, viewMode: "month" as const },
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      ...defaults,

      setDashboardFilter:   (k, v) => set((s) => ({ dashboard:   { ...s.dashboard,   [k]: v } })),
      setSolicitudesFilter: (k, v) => set((s) => ({ solicitudes: { ...s.solicitudes, [k]: v } })),
      setPropiedadesFilter: (k, v) => set((s) => ({ propiedades: { ...s.propiedades, [k]: v } })),
      setContactosFilter:   (k, v) => set((s) => ({ contactos:   { ...s.contactos,   [k]: v } })),
      setUsuariosFilter:    (k, v) => set((s) => ({ usuarios:    { ...s.usuarios,    [k]: v } })),
      setOrdenesFilter:     (k, v) => set((s) => ({ ordenes:     { ...s.ordenes,     [k]: v } })),
      setCalendarioFilter:  (k, v) => set((s) => ({ calendario:  { ...s.calendario,  [k]: v } })),

      resetDashboard:   () => set({ dashboard:   defaults.dashboard }),
      resetSolicitudes: () => set({ solicitudes: defaults.solicitudes }),
      resetPropiedades: () => set({ propiedades: defaults.propiedades }),
      resetContactos:   () => set({ contactos:   defaults.contactos }),
      resetUsuarios:    () => set({ usuarios:    defaults.usuarios }),
      resetOrdenes:     () => set({ ordenes:     { ...defaults.ordenes, date: today() } }),
      resetCalendario:  () => set({ calendario:  defaults.calendario }),
    }),
    {
      name:    "metria-filters",
      // Only persist non-ephemeral filters; reset date-based ones on load
      partialize: (s) => ({
        dashboard:   s.dashboard,
        solicitudes: { ...s.solicitudes, search: "" },
        propiedades: { ...s.propiedades, search: "" },
        contactos:   { ...s.contactos,   search: "" },
        usuarios:    { ...s.usuarios,    search: "" },
        calendario:  s.calendario,
      }),
    }
  )
);
