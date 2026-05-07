import { memo, useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  locale?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * AnimatedCounter — counts a number from its previous value to the new value
 * using requestAnimationFrame. Respects prefers-reduced-motion. Uses Arabic
 * (Eastern) digits by default to match the rest of the listing UI.
 */
const AnimatedCounter = memo(function AnimatedCounter({
  value,
  duration = 600,
  className = "",
  locale = "ar-EG",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const start = performance.now();
    const from = prevRef.current;
    const delta = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className={className} aria-label={String(value)}>
      {display.toLocaleString(locale)}
    </span>
  );
});

export default AnimatedCounter;
