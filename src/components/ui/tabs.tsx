// ─── Tabs ─────────────────────────────────────────────────────────────────────
// Navegación por pestañas con dos variantes visuales.
//
// USO:
//   const [tab, setTab] = useState("visitas");
//
//   <Tabs value={tab} onChange={setTab}>
//     <Tab value="visitas" label="Visitas" count={3} />
//     <Tab value="docs"    label="Documentos" />
//     <Tab value="notas"   label="Notas" />
//   </Tabs>
//
// VARIANTES: underline (default) | pill
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import type { ReactNode } from "react";

type TabVariant = "underline" | "pill";

// ── Contenedor de Tabs ────────────────────────────────────────────────────────

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  variant?: TabVariant;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, variant = "underline", children, className = "" }: TabsProps) {
  return (
    <div
      className={[
        variant === "pill"
          ? "flex gap-1 rounded-xl bg-surface-raised p-1"
          : "flex border-b border-border",
        className,
      ].join(" ")}
      role="tablist"
    >
      {/* Inyectar props a los hijos Tab */}
      {Array.isArray(children)
        ? children.map((child) => {
            if (!child || typeof child !== "object" || !("props" in child)) return child;
            return { ...child, props: { ...child.props, _active: child.props.value === value, _onChange: onChange, _variant: variant } };
          })
        : children}
    </div>
  );
}

// ── Tab individual ────────────────────────────────────────────────────────────

interface TabProps {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
  // Props inyectadas por Tabs (no usar directamente)
  _active?: boolean;
  _onChange?: (v: string) => void;
  _variant?: TabVariant;
}

export function Tab({
  value,
  label,
  count,
  icon,
  disabled = false,
  _active = false,
  _onChange,
  _variant = "underline",
}: TabProps) {
  const underlineActive = "border-b-2 border-primary text-primary";
  const underlineInactive = "border-b-2 border-transparent text-text-secondary hover:text-text-primary hover:border-border";
  const pillActive = "bg-surface text-text-primary shadow-sm";
  const pillInactive = "text-text-secondary hover:text-text-primary";

  return (
    <button
      role="tab"
      aria-selected={_active}
      disabled={disabled}
      onClick={() => _onChange?.(value)}
      className={[
        "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-40",
        _variant === "pill"
          ? `rounded-lg px-3 py-1.5 ${_active ? pillActive : pillInactive}`
          : `px-4 py-3 ${_active ? underlineActive : underlineInactive}`,
      ].join(" ")}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      {label}
      {count != null && (
        <span
          className={[
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
            _active
              ? "bg-primary/15 text-primary"
              : "bg-surface-raised text-text-secondary",
          ].join(" ")}
        >
          {count}
        </span>
      )}
    </button>
  );
}
