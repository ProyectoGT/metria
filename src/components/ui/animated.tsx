"use client";

import { type ReactNode, forwardRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  fadeInUp,
  fadeIn,
  slideInRight,
  fadeInScale,
  scaleTapIn,
  hoverLift,
  staggerContainer,
  staggerItem,
  dropdown,
  fastTransition,
} from "@/lib/animations";

// ─── AnimatedPage ──────────────────────────────────────────────────────────────
// Entrance animation para contenido de página completa.

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(prefersReduced ? { transition: { duration: 0 } } : {})}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedContent ───────────────────────────────────────────────────────────
// Fade simple para contenido interno (tabs, secciones).

interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
  key?: string;
}

export function AnimatedContent({ children, className, key }: AnimatedContentProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      key={key}
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(prefersReduced ? { transition: { duration: 0 } } : {})}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedCard ──────────────────────────────────────────────────────────────
// Card con hover lift.

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  noHover?: boolean;
  noEntrance?: boolean;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  function AnimatedCard({ children, className, noHover, noEntrance }, ref) {
    const prefersReduced = useReducedMotion();

    if (prefersReduced) {
      return <div ref={ref} className={className}>{children}</div>;
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        {...(noHover ? {} : { whileHover: "whileHover" })}
        {...(noEntrance ? {} : { initial: "initial", animate: "animate" })}
        variants={noHover ? fadeIn : hoverLift}
      >
        {children}
      </motion.div>
    );
  }
);

// ─── AnimatedButton ────────────────────────────────────────────────────────────
// Wrapper de botón con scale tap feedback.

interface AnimatedButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  [key: string]: unknown;
}

export function AnimatedButton({
  children,
  className,
  onClick,
  type = "button",
  disabled,
  ...props
}: AnimatedButtonProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      variants={scaleTapIn}
      whileTap={prefersReduced ? undefined : "whileTap"}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ─── AnimatedIconButton ────────────────────────────────────────────────────────
// Botón icono pequeño con scale tap.

export function AnimatedIconButton({
  children,
  onClick,
  label,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={label}
      whileTap={prefersReduced ? undefined : { scale: 0.9 }}
      transition={fastTransition}
    >
      {children}
    </motion.button>
  );
}

// ─── AnimatedListItem ──────────────────────────────────────────────────────────
// Item de lista con stagger.

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={staggerItem}
      className={className}
      {...(prefersReduced ? { transition: { duration: 0 } } : {})}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedList ──────────────────────────────────────────────────────────────
// Contenedor para lista con stagger children.

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}

export function AnimatedList({ children, className, fast }: AnimatedListProps) {
  const prefersReduced = useReducedMotion();
  const variants = fast ? staggerContainer : undefined;

  return (
    <motion.div
      initial={prefersReduced ? undefined : "initial"}
      animate={prefersReduced ? undefined : "animate"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedSidePanel ─────────────────────────────────────────────────────────
// Panel lateral deslizante.

interface AnimatedSidePanelProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedSidePanel({ children, className }: AnimatedSidePanelProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={slideInRight}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(prefersReduced ? { transition: { duration: 0 } } : {})}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedModal ─────────────────────────────────────────────────────────────
// Modal con fade + scale.

interface AnimatedModalProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedModal({ children, className }: AnimatedModalProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={fadeInScale}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(prefersReduced ? { transition: { duration: 0 } } : {})}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedOverlay ───────────────────────────────────────────────────────────
// Overlay con fade.

interface AnimatedOverlayProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AnimatedOverlay({ children, className, onClick }: AnimatedOverlayProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={prefersReduced ? { duration: 0 } : fastTransition}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedDropdown ──────────────────────────────────────────────────────────
// Menú desplegable con fade + scale.

interface AnimatedDropdownProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedDropdown({ children, className }: AnimatedDropdownProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={dropdown}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(prefersReduced ? { transition: { duration: 0 } } : {})}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedChevron ───────────────────────────────────────────────────────────
// Icono chevron que rota al expandir.

interface AnimatedChevronProps {
  isOpen: boolean;
  className?: string;
  children?: ReactNode;
}

export function AnimatedChevron({ isOpen, className, children }: AnimatedChevronProps) {
  return (
    <motion.span
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

// ─── AnimatedBadge ─────────────────────────────────────────────────────────────
// Badge con bounce de entrada.

interface AnimatedBadgeProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedBadge({ children, className }: AnimatedBadgeProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.span
      initial={prefersReduced ? undefined : { scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25, mass: 0.5 }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

// ─── AnimatedTabPanel ──────────────────────────────────────────────────────────
// Contenido de tab con fade.

interface AnimatedTabPanelProps {
  children: ReactNode;
  className?: string;
  active?: boolean;
}

export function AnimatedTabPanel({ children, className, active }: AnimatedTabPanelProps) {
  const prefersReduced = useReducedMotion();

  if (!active) return null;

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedProgress ──────────────────────────────────────────────────────────
// Barra de progreso animada.

interface AnimatedProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
}

export function AnimatedProgress({ value, className, barClassName }: AnimatedProgressProps) {
  return (
    <div className={className}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={barClassName}
      />
    </div>
  );
}

// ─── AnimatedAccordion ──────────────────────────────────────────────────────
// Acordeón con animación de altura + fade para contenido expandible.
// Usa AnimatePresence para animar entrada/salida del contenido.

interface AnimatedAccordionProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

export function AnimatedAccordion({ isOpen, children, className }: AnimatedAccordionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    if (!isOpen) return null;
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="accordion-content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`overflow-hidden ${className ?? ""}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── AnimatedFilterPanel ─────────────────────────────────────────────────────
// Panel de filtros con fade + slide vertical.

interface AnimatedFilterPanelProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

export function AnimatedFilterPanel({ isOpen, children, className }: AnimatedFilterPanelProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    if (!isOpen) return null;
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="filter-panel"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`overflow-hidden ${className ?? ""}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── AnimatedResults ─────────────────────────────────────────────────────────
// Panel de resultados con fade + slide hacia abajo (para dashboard filters).

interface AnimatedResultsProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export function AnimatedResults({ show, children, className }: AnimatedResultsProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    if (!show) return null;
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="results-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Framer Motion Re-exports ─────────────────────────────────────────────────
export { motion, AnimatePresence };
