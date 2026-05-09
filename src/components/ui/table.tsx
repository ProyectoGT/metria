// ─── Table ────────────────────────────────────────────────────────────────────
// Wrapper semántico para tablas del CRM con estilos consistentes.
//
// USO:
//   <Table>
//     <TableHead>
//       <tr>
//         <Th>Nombre</Th>
//         <Th align="right">Acciones</Th>
//       </tr>
//     </TableHead>
//     <TableBody>
//       <Tr>
//         <Td>Juan García</Td>
//         <Td align="right">…</Td>
//       </Tr>
//     </TableBody>
//   </Table>
//
// Para tablas completas con scroll horizontal:
//   <TableContainer>
//     <Table>…</Table>
//   </TableContainer>
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

type Align = "left" | "center" | "right";
const ALIGN: Record<Align, string> = {
  left:   "text-left",
  center: "text-center",
  right:  "text-right",
};

// ── TableContainer ────────────────────────────────────────────────────────────

export function TableContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={["overflow-x-auto rounded-ds-lg border border-border bg-surface shadow-layer-1", className].join(" ")}>
      {children}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <table className={["w-full min-w-[640px] text-sm", className].join(" ")}>
      {children}
    </table>
  );
}

// ── TableHead ─────────────────────────────────────────────────────────────────

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border bg-surface-raised/55">
        {children}
      </tr>
    </thead>
  );
}

// ── Th ────────────────────────────────────────────────────────────────────────

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
  children?: ReactNode;
}

export function Th({ align = "left", children, className = "", ...props }: ThProps) {
  return (
    <th
      className={[
        "px-5 py-3 text-xs font-semibold uppercase text-text-secondary",
        ALIGN[align],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </th>
  );
}

// ── TableBody ─────────────────────────────────────────────────────────────────

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

// ── Tr ────────────────────────────────────────────────────────────────────────

interface TrProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  muted?: boolean;
}

export function Tr({ children, onClick, className = "", muted = false }: TrProps) {
  return (
    <tr
      onClick={onClick}
      className={[
        "transition-colors",
        onClick ? "cursor-pointer hover:bg-state-hover" : "hover:bg-state-hover",
        muted ? "opacity-50" : "",
        className,
      ].join(" ")}
    >
      {children}
    </tr>
  );
}

// ── Td ────────────────────────────────────────────────────────────────────────

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
  children?: ReactNode;
}

export function Td({ align = "left", children, className = "", ...props }: TdProps) {
  return (
    <td
      className={[
        "px-5 py-3.5 align-middle text-text-primary",
        ALIGN[align],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </td>
  );
}
