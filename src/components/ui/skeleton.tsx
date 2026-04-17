function Sk({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-border/60 ${className ?? ""}`} />
  );
}

/* ── Header de página (título + descripción) ─────────────────────────── */
function PageHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Sk className="h-7 w-52" />
      <Sk className="h-4 w-36" />
    </div>
  );
}

/* ── Genérico ─────────────────────────────────────────────────────────── */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Sk key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Sk className="h-64 rounded-2xl" />
      <Sk className="h-48 rounded-2xl" />
    </div>
  );
}

/* ── Tabla genérica ───────────────────────────────────────────────────── */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-32 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="flex gap-4 border-b border-border px-5 py-3">
          {[40, 60, 30, 50].map((w, i) => (
            <Sk key={i} className={`h-4 w-${w}`} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Sk className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-1 gap-4">
                <Sk className="h-4 flex-1" />
                <Sk className="h-4 w-24" />
                <Sk className="h-4 w-20" />
                <Sk className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard (Kanban) ───────────────────────────────────────────────── */
export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[3, 2, 1].map((cards, i) => (
        <div key={i} className="flex w-72 shrink-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sk className="h-5 w-5 rounded-full" />
            <Sk className="h-5 w-28" />
          </div>
          {Array.from({ length: cards }).map((_, j) => (
            <div key={j} className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
              <Sk className="h-4 w-3/4" />
              <Sk className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Sk className="h-6 w-16 rounded-full" />
                <Sk className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
            <Sk className="h-4 w-24" />
            <Sk className="h-8 w-16" />
            <Sk className="h-3 w-32" />
          </div>
        ))}
      </div>
      <KanbanSkeleton />
    </div>
  );
}

/* ── Zona / Sectores ──────────────────────────────────────────────────── */
export function ZonaSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-32 rounded-xl" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface shadow-sm px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sk className="h-5 w-5 rounded" />
              <Sk className="h-5 w-32" />
              <Sk className="h-4 w-20" />
              <Sk className="h-4 w-16" />
            </div>
            <div className="flex gap-2">
              <Sk className="h-7 w-20 rounded-lg" />
              <Sk className="h-7 w-20 rounded-lg" />
              <Sk className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Solicitudes ──────────────────────────────────────────────────────── */
export function SolicitudesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-36 rounded-xl" />
      </div>
      {/* filter bar */}
      <div className="rounded-xl border border-border bg-surface px-4 py-3 flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1 flex-1">
            <Sk className="h-3 w-12" />
            <Sk className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {/* table */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Sk className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-1 gap-4">
                <Sk className="h-4 flex-1" />
                <Sk className="h-4 w-24" />
                <Sk className="h-4 w-28" />
                <Sk className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Calendario ───────────────────────────────────────────────────────── */
export function CalendarioSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-36 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-border bg-surface shadow-sm p-5 flex flex-col gap-4">
        {/* month nav */}
        <div className="flex items-center justify-between">
          <Sk className="h-7 w-32" />
          <div className="flex gap-2">
            <Sk className="h-8 w-8 rounded-lg" />
            <Sk className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        {/* day headers */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Sk key={i} className="h-4 w-full rounded" />
          ))}
        </div>
        {/* calendar grid */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, col) => (
              <Sk key={col} className="h-16 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Ordenes del dia ──────────────────────────────────────────────────── */
export function OrdenesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-36 rounded-xl" />
      </div>
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Sk key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-5">
        {/* task list */}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex gap-3">
            <Sk className="h-9 flex-1 rounded-xl" />
            <Sk className="h-9 w-40 rounded-xl" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface shadow-sm px-4 py-3 flex items-center gap-3">
              <Sk className="h-3 w-3 rounded-full shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <Sk className="h-4 w-3/4" />
                <Sk className="h-3 w-1/3" />
              </div>
              <Sk className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
        {/* detail panel */}
        <div className="w-72 shrink-0 rounded-2xl border border-border bg-surface shadow-sm p-5 flex flex-col gap-4">
          <Sk className="h-5 w-32" />
          <Sk className="h-24 rounded-xl" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Sk className="h-4 w-20" />
                <Sk className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Desarrollo ───────────────────────────────────────────────────────── */
export function DesarrolloSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Sk key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
            <Sk className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex flex-1 gap-4">
              <Sk className="h-4 w-36" />
              <Sk className="h-4 flex-1" />
              <Sk className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Usuarios ─────────────────────────────────────────────────────────── */
export function UsuariosSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-36 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="flex gap-4 border-b border-border px-5 py-3 bg-background">
          {["Nombre", "Email", "Rol", "Estado", ""].map((_, i) => (
            <Sk key={i} className="h-4 w-24" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Sk className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex flex-1 gap-6 items-center">
                <Sk className="h-4 w-36" />
                <Sk className="h-4 w-48" />
                <Sk className="h-5 w-20 rounded-full" />
                <Sk className="h-5 w-16 rounded-full" />
                <Sk className="h-7 w-7 rounded-lg ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Soporte ──────────────────────────────────────────────────────────── */
export function SoporteSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PageHeader />
        <Sk className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Sk key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
            <div className="flex flex-1 flex-col gap-2">
              <Sk className="h-4 w-2/3" />
              <Sk className="h-3 w-1/3" />
            </div>
            <Sk className="h-5 w-20 rounded-full" />
            <Sk className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Calculadora ──────────────────────────────────────────────────────── */
export function CalculadoraSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface shadow-sm p-6 flex flex-col gap-4">
          <Sk className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Sk className="h-3 w-24" />
              <Sk className="h-9 w-full rounded-lg" />
            </div>
          ))}
          <Sk className="h-10 w-full rounded-xl mt-2" />
        </div>
        <div className="rounded-2xl border border-border bg-surface shadow-sm p-6 flex flex-col gap-4">
          <Sk className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Sk className="h-4 w-32" />
              <Sk className="h-4 w-20" />
            </div>
          ))}
          <div className="border-t border-border pt-4 flex justify-between">
            <Sk className="h-6 w-24" />
            <Sk className="h-6 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
