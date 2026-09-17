/**
 * Al Masria Design System — motion presets.
 * One spring for everything; fades never exceed 300ms.
 */

export const dsSpring = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;

export const dsDuration = { fast: 0.16, base: 0.22, slow: 0.28 } as const;

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: dsDuration.base, ease: [0.4, 0, 0.2, 1] as const },
};

export const sheetUp = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
  transition: dsSpring,
};

export const backdropFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: dsDuration.fast },
};

export const pressScale = { whileTap: { scale: 0.98 }, transition: dsSpring };

export const cartBump = {
  scale: [1, 1.06, 1],
  transition: { duration: dsDuration.slow },
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
