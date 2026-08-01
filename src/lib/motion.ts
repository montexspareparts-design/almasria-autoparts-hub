/**
 * Shared motion tokens — Apple-grade timing.
 * Keep every native-shell animation on these curves so the app reads as
 * one system instead of a collection of ad-hoc transitions.
 */

export const easeOutIOS = [0.32, 0.72, 0, 1] as const;
export const easeStandard = [0.4, 0, 0.2, 1] as const;
export const easePush = [0.36, 0.66, 0.04, 1] as const;

export const springSnappy = { type: "spring", stiffness: 500, damping: 30, mass: 1 } as const;
export const springSoft = { type: "spring", stiffness: 260, damping: 26, mass: 1 } as const;
export const springTab = { type: "spring", stiffness: 400, damping: 34, mass: 0.9 } as const;

/** Standard section reveal used across the native home screen. */
export const revealUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: easeOutIOS },
};
