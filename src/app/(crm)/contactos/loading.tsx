export default function ContactosLoading() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-border" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-border" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-border" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <div className="h-4 w-48 animate-pulse rounded bg-border" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0">
            <div className="h-8 w-8 animate-pulse rounded-full bg-border" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 animate-pulse rounded bg-border" />
              <div className="h-3 w-24 animate-pulse rounded bg-border" />
            </div>
            <div className="hidden h-5 w-20 animate-pulse rounded-full bg-border md:block" />
            <div className="hidden h-3.5 w-28 animate-pulse rounded bg-border lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
