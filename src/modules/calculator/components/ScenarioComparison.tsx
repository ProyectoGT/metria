"use client";

type ScenarioComparisonProps = {
  columns: string[];
  rows: Array<{
    id: string;
    cells: string[];
    featured?: boolean;
  }>;
};

export default function ScenarioComparison({ columns, rows }: ScenarioComparisonProps) {
  return (
    <div className="overflow-hidden rounded-ds-lg border border-border bg-surface shadow-layer-1">
      <div className="grid bg-surface-elevated" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((column) => (
          <div key={column} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            {column}
          </div>
        ))}
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid hover:bg-state-hover"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {row.cells.map((cell, index) => (
              <div
                key={`${row.id}-${index}`}
                className={`px-4 py-3 text-sm ${row.featured || index === 0 ? "font-semibold text-text-primary" : "text-text-secondary"}`}
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
