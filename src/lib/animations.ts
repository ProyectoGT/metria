import { type Variants, type Transition } from "framer-motion";

// ─── Tokens de duración ───────────────────────────────────────────────────────
const DURATION = {
  fast: 0.15,
  normal: 0.2,
  medium: 0.25,
  slow: 0.3,
};

// ─── Easing ────────────────────────────────────────────────────────────────────
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

// ─── Transiciones reutilizables ────────────────────────────────────────────────
export const fastTransition: Transition = { duration: DURATION.fast, ease: EASE_OUT };
export const normalTransition: Transition = { duration: DURATION.normal, ease: EASE_OUT };
export const mediumTransition: Transition = { duration: DURATION.medium, ease: EASE_OUT };
export const slowTransition: Transition = { duration: DURATION.slow, ease: EASE_IN_OUT };

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
  mass: 0.8,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};

export const springSnap: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.5,
};

// ─── Variants ──────────────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: normalTransition },
  exit: { opacity: 0, transition: fastTransition },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: mediumTransition },
  exit: { opacity: 0, y: -8, transition: fastTransition },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0, transition: mediumTransition },
  exit: { opacity: 0, y: -8, transition: fastTransition },
};

export const fadeInScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { ...springTransition, ...normalTransition } },
  exit: { opacity: 0, scale: 0.95, transition: fastTransition },
};

export const slideInRight: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { ...springTransition, ...mediumTransition } },
  exit: { x: "100%", opacity: 0, transition: mediumTransition },
};

export const slideInLeft: Variants = {
  initial: { x: "-100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { ...springTransition, ...mediumTransition } },
  exit: { x: "-100%", opacity: 0, transition: mediumTransition },
};

export const slideInUp: Variants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { ...springTransition, ...normalTransition } },
  exit: { y: 20, opacity: 0, transition: fastTransition },
};

export const scaleTap: Variants = {
  whileTap: { scale: 0.97, transition: fastTransition },
  whileHover: { scale: 1.02, transition: fastTransition },
};

export const scaleTapIn: Variants = {
  whileTap: { scale: 0.95, transition: fastTransition },
};

export const hoverLift: Variants = {
  whileHover: {
    y: -2,
    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
    transition: normalTransition,
  },
};

export const hoverScale: Variants = {
  whileHover: { scale: 1.02, transition: fastTransition },
};

export const expandCollapse: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { ...springSoft, ...normalTransition } },
  exit: { height: 0, opacity: 0, transition: fastTransition },
};

export const rotateChevron: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: 180, transition: springSnap },
};

export const badgeBounce: Variants = {
  initial: { scale: 0 },
  animate: { scale: 1, transition: springSnap },
  exit: { scale: 0, transition: fastTransition },
};

// ─── Stagger ───────────────────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.025,
      delayChildren: 0.03,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { ...springTransition, ...normalTransition } },
};

export const staggerItemFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: normalTransition },
};

// ─── Dropdown / Menu ───────────────────────────────────────────────────────────

export const dropdown: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springSnap, ...fastTransition },
  },
  exit: { opacity: 0, y: -4, scale: 0.97, transition: fastTransition },
};

// ─── Skeleton pulse ────────────────────────────────────────────────────────────

export const skeletonPulse: Variants = {
  animate: {
    opacity: [1, 0.4, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ─── Progress bar ──────────────────────────────────────────────────────────────

export const progressFill: Variants = {
  initial: { width: 0 },
  animate: (width: number) => ({
    width: `${width}%`,
    transition: { duration: DURATION.slow, ease: EASE_IN_OUT },
  }),
};
